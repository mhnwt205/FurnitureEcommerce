import { generateOpaqueRefreshToken, hashToken } from '../utils/tokenService.js';

const GUEST_ORDER_MANAGEMENT_TOKEN_EXPIRES_IN_DAYS = 90;
const MAX_TOKEN_GENERATION_ATTEMPTS = 3;
const MAX_GUEST_MANAGEMENT_TOKEN_LENGTH = 512;

export class GuestOrderTokenError extends Error {
  constructor(code = 'INVALID_GUEST_ORDER_TOKEN') {
    super(code);
    this.name = 'GuestOrderTokenError';
    this.code = code;
  }
}

export const getGuestOrderManagementTokenExpiresAt = (now = new Date()) => (
  new Date(now.getTime() + GUEST_ORDER_MANAGEMENT_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000)
);

export const generateGuestOrderManagementToken = (now = new Date()) => {
  const rawToken = generateOpaqueRefreshToken();

  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: getGuestOrderManagementTokenExpiresAt(now)
  };
};

export const generateUniqueGuestOrderManagementToken = async (client, now = new Date()) => {
  for (let attempt = 0; attempt < MAX_TOKEN_GENERATION_ATTEMPTS; attempt += 1) {
    const token = generateGuestOrderManagementToken(now);
    const existing = await client.order.findFirst({
      where: { managementTokenHash: token.tokenHash },
      select: { id: true }
    });

    if (!existing) return token;
  }

  throw new Error('GUEST_MANAGEMENT_TOKEN_COLLISION');
};

export const resolveGuestOrderByManagementToken = async (client, rawToken, options = {}) => {
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!token || token.length > MAX_GUEST_MANAGEMENT_TOKEN_LENGTH) {
    throw new GuestOrderTokenError();
  }

  const tokenHash = hashToken(token);
  const order = await client.order.findFirst({
    where: {
      managementTokenHash: tokenHash,
      managementTokenExpiresAt: { gt: new Date() },
      managementTokenRevokedAt: null,
      userId: null
    },
    include: options.include
  });

  if (!order) throw new GuestOrderTokenError();
  return order;
};
