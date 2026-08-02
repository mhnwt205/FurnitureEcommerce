import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger.js';
import { aiTelemetry } from '../services/ai-advisor/telemetry/telemetry.service.js';

const positiveInteger = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};

const safeRetryAfterSeconds = (resetTime) => {
  const milliseconds = resetTime instanceof Date ? resetTime.getTime() - Date.now() : 0;
  return Math.min(300, Math.max(1, Math.ceil(milliseconds / 1000) || 60));
};

const createLimiter = ({ event, maxEnv, windowEnv, limit, windowMs, keyGenerator, logIp = true, onRejected = null }) => rateLimit({
  windowMs: positiveInteger(windowEnv, windowMs),
  limit: positiveInteger(maxEnv, limit),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    const retryAfterSeconds = safeRetryAfterSeconds(req.rateLimit?.resetTime);
    logger.warn('rate_limit_rejected', { requestId: req.requestId, method: req.method, path: req.path, userId: req.user?.id, ...(logIp ? { ip: req.ip } : {}), reason: event });
    try { onRejected?.({ requestId: req.requestId || null, retryAfterSeconds }); } catch {}
    res.status(429).json({ message: 'Too many requests. Please try again later.', requestId: req.requestId });
  }
});

const ipKey = (req) => ipKeyGenerator(req.ip);
const onAiAdvisorRejected = ({ requestId, retryAfterSeconds }) => aiTelemetry.emit('ai_rate_limit_rejected', { requestId, ownerType: 'guest', metadata: { retryAfterSeconds } });
export const createAiAdvisorRateLimiter = (overrides = {}) => createLimiter({ event: 'ai_advisor', maxEnv: 'AI_ADVISOR_RATE_LIMIT_MAX', windowEnv: 'AI_ADVISOR_RATE_LIMIT_WINDOW_MS', limit: 20, windowMs: 5 * 60 * 1000, keyGenerator: ipKey, logIp: false, onRejected: onAiAdvisorRejected, ...overrides });
export const aiAdvisorRateLimiter = createAiAdvisorRateLimiter();
export const consultationRequestRateLimiter = createLimiter({ event: 'consultation_request', maxEnv: 'CONSULTATION_REQUEST_RATE_LIMIT_MAX', windowEnv: 'CONSULTATION_REQUEST_RATE_LIMIT_WINDOW_MS', limit: 5, windowMs: 60 * 60 * 1000, keyGenerator: ipKey });
export const uploadRateLimiter = createLimiter({ event: 'upload', maxEnv: 'UPLOAD_RATE_LIMIT_MAX', windowEnv: 'UPLOAD_RATE_LIMIT_WINDOW_MS', limit: 30, windowMs: 15 * 60 * 1000, keyGenerator: (req) => req.user?.id ? `user:${req.user.id}` : ipKey(req) });
