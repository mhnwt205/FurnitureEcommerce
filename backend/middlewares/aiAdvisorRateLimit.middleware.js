import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { getAiConfig } from '../services/ai/aiConfig.js';
import { AI_ERROR_CODE } from '../services/ai/aiContracts.js';
import { logger } from '../utils/logger.js';

const safeLog = (loggerImpl, level, event, metadata) => {
  try { loggerImpl?.[level]?.(event, metadata); } catch {}
};

const retryAfterSeconds = (resetTime) => {
  const remainingMs = resetTime instanceof Date ? resetTime.getTime() - Date.now() : 0;
  return Math.max(1, Math.ceil(remainingMs / 1_000) || 1);
};

const logConfigWarnings = (config, loggerImpl) => {
  for (const issue of config?.issues ?? []) {
    if (issue?.code === AI_ERROR_CODE.configInvalid && typeof issue.field === 'string') {
      safeLog(loggerImpl, 'warn', 'ai_config_default_applied', { field: issue.field, reason: 'safe_default' });
    }
  }
};

export const aiAdvisorIpKey = (req) => ipKeyGenerator(req.ip);

export const createAiAdvisorRateLimiter = ({ config = getAiConfig(), loggerImpl = logger } = {}) => {
  logConfigWarnings(config, loggerImpl);
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: aiAdvisorIpKey,
    handler: (req, res) => {
      const seconds = retryAfterSeconds(req.rateLimit?.resetTime);
      safeLog(loggerImpl, 'warn', 'ai_rate_limit_rejected', {
        requestId: req.requestId,
        ownerType: 'ip',
        retryAfterSeconds: seconds
      });
      res.setHeader('Retry-After', String(seconds));
      return res.status(429).json({ message: 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau.' });
    }
  });
};
