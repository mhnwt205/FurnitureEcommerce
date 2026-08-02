import {
  AI_CONSTANTS,
  AI_ERROR_CODE
} from './aiContracts.js';

const readTrimmedString = (environment, name) => {
  const value = environment?.[name];
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

const readBoundedInteger = ({ environment, name, fallback, min = 1, max = Number.MAX_SAFE_INTEGER, issues }) => {
  const rawValue = environment?.[name];
  if (rawValue === undefined || rawValue === null) return fallback;
  const value = String(rawValue).trim();
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || String(parsed) !== value || parsed < min || parsed > max) {
    issues.push(Object.freeze({ code: AI_ERROR_CODE.configInvalid, field: name }));
    return fallback;
  }
  return parsed;
};

export const getAiConfig = (environment = process.env) => {
  const issues = [];
  const config = {
    apiKey: readTrimmedString(environment, 'GEMINI_API_KEY'),
    model: readTrimmedString(environment, 'AI_MODEL'),
    timeoutMs: readBoundedInteger({
      environment,
      name: 'AI_TIMEOUT_MS',
      fallback: AI_CONSTANTS.defaultTimeoutMs,
      min: AI_CONSTANTS.minTimeoutMs,
      max: AI_CONSTANTS.maxTimeoutMs,
      issues
    }),
    maxCandidates: readBoundedInteger({
      environment,
      name: 'AI_MAX_CANDIDATES',
      fallback: AI_CONSTANTS.defaultMaxCandidates,
      max: AI_CONSTANTS.hardMaxCandidates,
      issues
    }),
    rateLimitMax: readBoundedInteger({
      environment,
      name: 'AI_RATE_LIMIT_MAX',
      fallback: AI_CONSTANTS.defaultRateLimitMax,
      min: AI_CONSTANTS.minRateLimitMax,
      max: AI_CONSTANTS.maxRateLimitMax,
      issues
    }),
    rateLimitWindowMs: readBoundedInteger({
      environment,
      name: 'AI_RATE_LIMIT_WINDOW_MS',
      fallback: AI_CONSTANTS.defaultRateLimitWindowMs,
      min: AI_CONSTANTS.minRateLimitWindowMs,
      max: AI_CONSTANTS.maxRateLimitWindowMs,
      issues
    }),
    issues: Object.freeze(issues)
  };
  return Object.freeze(config);
};
