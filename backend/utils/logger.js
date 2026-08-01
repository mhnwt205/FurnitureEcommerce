const ALLOWED_FIELDS = new Set(['requestId', 'method', 'path', 'statusCode', 'durationMs', 'userId', 'ip', 'errorName', 'errorCode', 'socketId', 'signal', 'reason', 'sessionId', 'ownerType', 'outcome', 'messageLength', 'intentType', 'confidenceBucket', 'category', 'candidateCount', 'primaryCount', 'retrievedCount', 'rankedCount', 'selectedCount', 'recommendationCount', 'clarificationField', 'reasonCode', 'fallbackReason', 'provider', 'model', 'providerOperation', 'attempt', 'retryCount', 'httpStatus', 'timeout', 'fallbackUsed', 'diversificationApplied', 'writerUsed', 'writerFallbackUsed', 'groundedReasonFallbackCount', 'sessionAction']);

const sanitize = (metadata = {}) => Object.fromEntries(
  Object.entries(metadata).filter(([key, value]) => ALLOWED_FIELDS.has(key) && value !== undefined && value !== null)
);

const write = (level, event, metadata, error) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: 'furniture-backend',
    environment: process.env.NODE_ENV || 'development',
    event,
    ...sanitize(metadata)
  };
  if (error) {
    payload.errorName = error.name || 'Error';
    if (error.code) payload.errorCode = String(error.code);
    if (process.env.NODE_ENV !== 'production' && error.stack) payload.stack = error.stack;
  }
  const line = JSON.stringify(payload);
  if (level === 'warn' || level === 'error') console.error(line);
  else console.log(line);
};

export const logger = {
  info: (event, metadata) => write('info', event, metadata),
  warn: (event, metadata, error) => write('warn', event, metadata, error),
  error: (event, metadata, error) => write('error', event, metadata, error)
};
