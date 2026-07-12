import { rateLimit } from 'express-rate-limit';

const positiveIntegerEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};

export const orderLookupRateLimiter = rateLimit({
  windowMs: positiveIntegerEnv('ORDER_LOOKUP_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  limit: positiveIntegerEnv('ORDER_LOOKUP_RATE_LIMIT_MAX', 10),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Quá nhiều yêu cầu tra cứu. Vui lòng thử lại sau.' }
});
