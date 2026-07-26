import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { getRequestId } from './requestContext.middleware.js';

const positiveIntegerEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};

const supportMessageRateLimit = ({ windowEnv, maxEnv, windowMs, limit }) => rateLimit({
  windowMs: positiveIntegerEnv(windowEnv, windowMs),
  limit: positiveIntegerEnv(maxEnv, limit),
  keyGenerator: (req) => `${req.user?.id ?? 'unknown'}:${ipKeyGenerator(req.ip)}`,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many support messages. Please try again later.' },
    requestId: getRequestId(req)
  })
});

export const supportMessageMinuteRateLimiter = supportMessageRateLimit({
  windowEnv: 'SUPPORT_MESSAGE_RATE_LIMIT_MINUTE_WINDOW_MS',
  maxEnv: 'SUPPORT_MESSAGE_RATE_LIMIT_MINUTE_MAX',
  windowMs: 60 * 1000,
  limit: 30
});

export const supportMessageHourRateLimiter = supportMessageRateLimit({
  windowEnv: 'SUPPORT_MESSAGE_RATE_LIMIT_HOUR_WINDOW_MS',
  maxEnv: 'SUPPORT_MESSAGE_RATE_LIMIT_HOUR_MAX',
  windowMs: 60 * 60 * 1000,
  limit: 300
});
