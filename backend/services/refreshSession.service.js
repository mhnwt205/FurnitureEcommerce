import prisma from '../prismaClient.js';
import {
  generateOpaqueRefreshToken,
  generateRefreshFamilyId,
  getRefreshTokenExpiresAt,
  hashIpAddress,
  hashToken
} from '../utils/tokenService.js';
import { AuthTokenError, REFRESH_TOKEN_ERROR_CODES } from '../utils/authErrors.js';

const MAX_USER_AGENT_LENGTH = 512;
const DEFAULT_CLEANUP_RETENTION_DAYS = 30;

const truncateUserAgent = (userAgent) => {
  if (!userAgent) return null;
  return String(userAgent).slice(0, MAX_USER_AGENT_LENGTH);
};

const toStoredIpHash = ({ ipAddress, ipAddressHash } = {}) => {
  if (ipAddressHash) return String(ipAddressHash);
  return hashIpAddress(ipAddress);
};

const buildSessionSelect = () => ({
  id: true,
  userId: true,
  tokenHash: true,
  familyId: true,
  expiresAt: true,
  revokedAt: true,
  replacedByTokenId: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
  userAgent: true,
  ipAddressHash: true,
  user: {
    select: {
      id: true,
      role: true,
      isActive: true
    }
  }
});

export const createRefreshSession = async ({
  userId,
  userAgent,
  ipAddress,
  ipAddressHash,
  familyId
}, client = prisma) => {
  if (!userId) {
    throw new Error('userId is required to create a refresh session');
  }

  const rawToken = generateOpaqueRefreshToken();
  const tokenHash = hashToken(rawToken);

  const session = await client.refreshSession.create({
    data: {
      userId,
      tokenHash,
      familyId: familyId || generateRefreshFamilyId(),
      expiresAt: getRefreshTokenExpiresAt(),
      userAgent: truncateUserAgent(userAgent),
      ipAddressHash: toStoredIpHash({ ipAddress, ipAddressHash })
    },
    select: buildSessionSelect()
  });

  return { rawToken, session };
};

export const findRefreshSessionByRawToken = async (rawToken, client = prisma) => {
  if (!rawToken) {
    throw new AuthTokenError(
      REFRESH_TOKEN_ERROR_CODES.MISSING,
      'Refresh token is missing'
    );
  }

  return client.refreshSession.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: buildSessionSelect()
  });
};

const assertUsableSession = async (session) => {
  if (!session) {
    throw new AuthTokenError(
      REFRESH_TOKEN_ERROR_CODES.INVALID,
      'Refresh token is invalid'
    );
  }

  if (session.revokedAt) {
    await revokeRefreshFamily(session.familyId);
    throw new AuthTokenError(
      REFRESH_TOKEN_ERROR_CODES.REUSE,
      'Refresh token reuse detected'
    );
  }

  if (session.expiresAt <= new Date()) {
    throw new AuthTokenError(
      REFRESH_TOKEN_ERROR_CODES.EXPIRED,
      'Refresh token is expired'
    );
  }

  if (!session.user?.isActive) {
    throw new AuthTokenError(
      REFRESH_TOKEN_ERROR_CODES.USER_INACTIVE,
      'User account is inactive'
    );
  }
};

export const rotateRefreshSession = async (rawToken, {
  userAgent,
  ipAddress,
  ipAddressHash
} = {}) => {
  const existingSession = await findRefreshSessionByRawToken(rawToken);
  await assertUsableSession(existingSession);

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const revokeResult = await tx.refreshSession.updateMany({
      where: {
        id: existingSession.id,
        revokedAt: null,
        expiresAt: { gt: now }
      },
      data: {
        revokedAt: now,
        lastUsedAt: now
      }
    });

    if (revokeResult.count !== 1) {
      await tx.refreshSession.updateMany({
        where: {
          familyId: existingSession.familyId,
          revokedAt: null
        },
        data: { revokedAt: now }
      });

      throw new AuthTokenError(
        REFRESH_TOKEN_ERROR_CODES.REUSE,
        'Refresh token reuse detected'
      );
    }

    const nextSession = await createRefreshSession({
      userId: existingSession.userId,
      userAgent,
      ipAddress,
      ipAddressHash,
      familyId: existingSession.familyId
    }, tx);

    await tx.refreshSession.update({
      where: { id: existingSession.id },
      data: { replacedByTokenId: nextSession.session.id }
    });

    return nextSession;
  });
};

export const revokeRefreshSession = async (sessionId, client = prisma) => {
  if (!sessionId) return { count: 0 };

  return client.refreshSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
};

export const revokeRefreshFamily = async (familyId, client = prisma) => {
  if (!familyId) return { count: 0 };

  return client.refreshSession.updateMany({
    where: {
      familyId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
};

export const revokeAllUserSessions = async (userId, client = prisma) => {
  if (!userId) return { count: 0 };

  return client.refreshSession.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
};

export const cleanupExpiredSessions = async ({
  retentionDays = DEFAULT_CLEANUP_RETENTION_DAYS
} = {}, client = prisma) => {
  const safeRetentionDays = Number.isFinite(retentionDays) && retentionDays >= 0
    ? retentionDays
    : DEFAULT_CLEANUP_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - safeRetentionDays * 24 * 60 * 60 * 1000);

  return client.refreshSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: cutoff } },
        { revokedAt: { lt: cutoff } }
      ]
    }
  });
};

export { truncateUserAgent };
