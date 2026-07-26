import crypto from 'crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

const suppliedRequestId = (req) => {
  const supplied = typeof req.get === 'function' ? req.get('x-request-id') : req.headers?.['x-request-id'];
  return typeof supplied === 'string' && REQUEST_ID_PATTERN.test(supplied) ? supplied : null;
};

// This fallback is only for isolated middleware/controller invocation in tests.
// The mounted Express path always reaches requestContext first.
export const getRequestId = (req) => {
  if (typeof req.requestId === 'string' && REQUEST_ID_PATTERN.test(req.requestId)) return req.requestId;
  req.requestId = suppliedRequestId(req) || crypto.randomUUID();
  return req.requestId;
};

export const requestContext = (req, res, next) => {
  res.setHeader('X-Request-Id', getRequestId(req));
  next();
};
