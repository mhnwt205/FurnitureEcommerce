import { rateLimit } from 'express-rate-limit';

const DEFAULTS = Object.freeze({
  login: { max: 10, windowMs: 15 * 60 * 1000 },
  google: { max: 20, windowMs: 15 * 60 * 1000 },
  refresh: { max: 60, windowMs: 15 * 60 * 1000 },
  forgot: { max: 5, windowMs: 60 * 60 * 1000 },
  reset: { max: 10, windowMs: 60 * 60 * 1000 }
});

const positiveIntegerEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};

const createAuthLimiter = ({ key, maxEnv, windowEnv }) => rateLimit({
  windowMs: positiveIntegerEnv(windowEnv, DEFAULTS[key].windowMs),
  limit: positiveIntegerEnv(maxEnv, DEFAULTS[key].max),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' }
});

export const loginRateLimiter = createAuthLimiter({
  key: 'login',
  maxEnv: 'AUTH_LOGIN_RATE_LIMIT_MAX',
  windowEnv: 'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS'
});

export const googleRateLimiter = createAuthLimiter({
  key: 'google',
  maxEnv: 'AUTH_GOOGLE_RATE_LIMIT_MAX',
  windowEnv: 'AUTH_GOOGLE_RATE_LIMIT_WINDOW_MS'
});

export const refreshRateLimiter = createAuthLimiter({
  key: 'refresh',
  maxEnv: 'AUTH_REFRESH_RATE_LIMIT_MAX',
  windowEnv: 'AUTH_REFRESH_RATE_LIMIT_WINDOW_MS'
});

export const forgotPasswordRateLimiter = createAuthLimiter({
  key: 'forgot',
  maxEnv: 'AUTH_FORGOT_RATE_LIMIT_MAX',
  windowEnv: 'AUTH_FORGOT_RATE_LIMIT_WINDOW_MS'
});

export const resetPasswordRateLimiter = createAuthLimiter({
  key: 'reset',
  maxEnv: 'AUTH_RESET_RATE_LIMIT_MAX',
  windowEnv: 'AUTH_RESET_RATE_LIMIT_WINDOW_MS'
});