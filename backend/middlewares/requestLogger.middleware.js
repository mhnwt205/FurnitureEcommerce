import { logger } from '../utils/logger.js';
import { recordHttpMetric } from '../utils/metrics.js';

export const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const path = req.originalUrl.split('?')[0];
  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const metadata = { requestId: req.requestId, method: req.method, path, statusCode: res.statusCode, durationMs: Number(durationMs.toFixed(2)), userId: req.user?.id };
    recordHttpMetric(metadata);
    if (res.statusCode >= 500) logger.error('http_request_completed', metadata);
    else if (res.statusCode >= 400 && res.statusCode !== 404) logger.warn('http_request_completed', metadata);
    else logger.info('http_request_completed', metadata);
  });
  next();
};
