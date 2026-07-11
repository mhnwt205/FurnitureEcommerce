import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const REFRESH_TOKEN_BYTES = 64;
const DEFAULT_ACCESS_EXPIRES_IN = '15m';

const isProduction = () => process.env.NODE_ENV === 'production';

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value && isProduction()) {
    throw new Error(`${name} is required in production`);
  }
  return value;
};

export const getAccessTokenSecret = () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  if (accessSecret) return accessSecret;

  const legacySecret = process.env.JWT_SECRET;
  if (legacySecret) return legacySecret;

  requireEnv('JWT_ACCESS_SECRET');
  throw new Error('JWT_ACCESS_SECRET is required');
};

export const signAccessToken = ({ user, sessionId } = {}) => {
  if (!user?.id) {
    throw new Error('user.id is required to sign an access token');
  }

  const payload = {
    sub: String(user.id),
    id: user.id
  };

  if (sessionId) payload.sessionId = sessionId;
  if (user.role) payload.role = user.role;

  return jwt.sign(payload, getAccessTokenSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || DEFAULT_ACCESS_EXPIRES_IN
  });
};

export const verifyAccessToken = (token) => (
  jwt.verify(token, getAccessTokenSecret())
);

export const generateOpaqueRefreshToken = () => (
  crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
);

export const generateRefreshFamilyId = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(32).toString('base64url');
};

export const hashToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Token is required');
  }

  const hmacSecret = process.env.REFRESH_TOKEN_HASH_SECRET;
  if (hmacSecret) {
    return crypto.createHmac('sha256', hmacSecret).update(token).digest('hex');
  }

  return crypto.createHash('sha256').update(token).digest('hex');
};

export const hashIpAddress = (ipAddress) => {
  if (!ipAddress) return null;
  return hashToken(String(ipAddress));
};

export const getRefreshTokenExpiresAt = () => {
  const days = Number.parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '14', 10);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 14;
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
};

export const getRefreshTokenMaxAgeMs = () => {
  const days = Number.parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '14', 10);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 14;
  return safeDays * 24 * 60 * 60 * 1000;
};
