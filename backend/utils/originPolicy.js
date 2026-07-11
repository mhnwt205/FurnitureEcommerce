const DEFAULT_LOCAL_ORIGIN = 'http://localhost:5173';

const normalizeOrigin = (value) => {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const parseOrigins = (value) => String(value || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin.trim()))
  .filter(Boolean);

export const getAllowedOrigins = () => {
  const configuredOrigins = [
    ...parseOrigins(process.env.CORS_ALLOWED_ORIGINS),
    ...parseOrigins(process.env.FRONTEND_URL)
  ];

  if (configuredOrigins.length > 0) {
    return [...new Set(configuredOrigins)];
  }

  return process.env.NODE_ENV === 'production' ? [] : [DEFAULT_LOCAL_ORIGIN];
};

export const isAllowedOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);
  return Boolean(normalizedOrigin && getAllowedOrigins().includes(normalizedOrigin));
};

export const requireAllowedCookieOrigin = (req, res, next) => {
  const origin = req.get('origin');
  if (origin) {
    if (isAllowedOrigin(origin)) return next();
    return res.status(403).json({ message: 'Request origin is not allowed' });
  }

  const referer = req.get('referer');
  if (referer) {
    if (isAllowedOrigin(referer)) return next();
    return res.status(403).json({ message: 'Request origin is not allowed' });
  }

  if (req.get('sec-fetch-site')) {
    return res.status(403).json({ message: 'Request origin is required' });
  }

  return next();
};