const reportOnlyPolicy = (req, res, next) => {
  const origins = String(process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    `connect-src 'self' ${origins.join(' ')} https://accounts.google.com https://oauth2.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com"
  ];
  res.setHeader('Content-Security-Policy-Report-Only', directives.join('; '));
  next();
};

export { reportOnlyPolicy };
