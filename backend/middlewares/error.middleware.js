import multer from 'multer';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

const SAFE_ERROR_STATUSES = new Set([400, 401, 403, 404, 409, 413, 429, 500]);

export const notFoundHandler = (req, res) => res.status(404).json({ message: 'Not found', requestId: req.requestId });

const statusForError = (error) => {
  if (error instanceof SyntaxError && error.status === 400 && Object.hasOwn(error, 'body')) return 400;
  if (error?.type === 'entity.too.large' || error?.status === 413) return 413;
  if (error instanceof multer.MulterError) return error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return 409;
    if (error.code === 'P2025') return 404;
  }
  return SAFE_ERROR_STATUSES.has(error?.status) ? error.status : 500;
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const isCorsError = error?.message === 'Not allowed by CORS';
  const status = isCorsError ? 403 : statusForError(error);
  const isSupportConversationRequest = req.path.startsWith('/api/support/conversations') || req.path.startsWith('/api/admin/support/conversations');
  logger.error('http_request_failed', { requestId: req.requestId, method: req.method, path: req.path, statusCode: status, errorCode: error?.code }, error);
  if (isCorsError) {
    if (isSupportConversationRequest) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Origin not allowed by CORS' }, requestId: req.requestId });
    return res.status(403).json({ message: 'Origin not allowed by CORS', requestId: req.requestId });
  }
  if (isSupportConversationRequest) {
    return res.status(status).json({ error: { code: status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR', message: status === 400 ? 'Request validation failed' : 'Internal server error' }, requestId: req.requestId });
  }
  if (status === 400) return res.status(400).json({ message: 'Request validation failed', requestId: req.requestId });
  if (status === 413) return res.status(413).json({ message: 'Request entity too large', requestId: req.requestId });
  if (status === 404) return res.status(404).json({ message: 'Not found', requestId: req.requestId });
  if (status === 409) return res.status(409).json({ message: 'Request conflicts with existing data', requestId: req.requestId });
  if (status === 401) return res.status(401).json({ message: 'Unauthorized', requestId: req.requestId });
  if (status === 403) return res.status(403).json({ message: 'Forbidden', requestId: req.requestId });
  if (status === 429) return res.status(429).json({ message: 'Too many requests. Please try again later.', requestId: req.requestId });
  return res.status(500).json({ message: 'Something went wrong. Please try again later.', requestId: req.requestId });
};
