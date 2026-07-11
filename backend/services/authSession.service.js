import prisma from '../prismaClient.js';
import { createRefreshSession } from './refreshSession.service.js';
import { signAccessToken } from '../utils/tokenService.js';

export const userAuthInclude = {
  userPermissions: {
    select: {
      permission: {
        select: { key: true }
      }
    }
  }
};

export const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  address: true,
  role: true,
  provider: true,
  isActive: true,
  emailVerified: true,
  avatarUrl: true,
  createdAt: true,
  userPermissions: userAuthInclude.userPermissions
};

export const toSafeUser = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role,
    provider: user.provider,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    userPermissions: user.userPermissions || []
  };
};

export const getAuthUserById = async (userId) => (
  prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect
  })
);

export const getAuthUserByEmail = async (email) => (
  prisma.user.findUnique({
    where: { email },
    include: userAuthInclude
  })
);

export const getRequestAuthMetadata = (req) => ({
  userAgent: req.get?.('user-agent') || null,
  ipAddress: req.ip || req.socket?.remoteAddress || null
});

export const buildAuthPayload = ({ user, sessionId }) => {
  const safeUser = toSafeUser(user);
  const accessToken = signAccessToken({
    user: safeUser,
    sessionId
  });

  return {
    accessToken,
    token: accessToken,
    user: safeUser
  };
};

export const issueAuthSession = async ({ user, req }) => {
  const { rawToken, session } = await createRefreshSession({
    userId: user.id,
    ...getRequestAuthMetadata(req)
  });

  return {
    ...buildAuthPayload({ user, sessionId: session.id }),
    refreshToken: rawToken,
    session
  };
};
