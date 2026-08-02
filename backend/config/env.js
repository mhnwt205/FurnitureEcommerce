import { validateVNPayEnvironmentConfig } from './vnpay.js';

const SECRET_MIN_LENGTH = 32;

export class EnvironmentValidationError extends Error {
  constructor(issues) {
    super(`Invalid production environment: ${issues.join('; ')}`);
    this.name = 'EnvironmentValidationError';
    this.issues = issues;
  }
}

const required = (environment, issues, name) => {
  const value = environment[name];

  if (!value || !String(value).trim()) {
    issues.push(`${name} is required`);
  }

  return String(value || '').trim();
};

const httpsUrl = (value, issues, name) => {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:') {
      throw new Error('HTTPS required');
    }

    return url;
  } catch {
    issues.push(`${name} must be an absolute HTTPS URL`);
    return null;
  }
};

const httpsOrigin = (value, issues, name) => {
  const url = httpsUrl(value, issues, name);

  if (!url) {
    return null;
  }

  if (
    url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    issues.push(
      `${name} must be an HTTPS origin without path, query, fragment, or credentials`,
    );

    return null;
  }

  return url.origin;
};

const positiveInteger = (
  value,
  issues,
  name,
  {
    min = 1,
    max = Number.MAX_SAFE_INTEGER,
  } = {},
) => {
  const normalizedValue = String(value).trim();
  const parsed = Number.parseInt(normalizedValue, 10);

  if (
    !Number.isSafeInteger(parsed)
    || String(parsed) !== normalizedValue
    || parsed < min
    || parsed > max
  ) {
    issues.push(`${name} must be an integer between ${min} and ${max}`);
    return null;
  }

  return parsed;
};

const validateOptionalPositiveInteger = (
  environment,
  issues,
  name,
) => {
  if (
    environment[name] !== undefined
    && String(environment[name]).trim() !== ''
  ) {
    positiveInteger(environment[name], issues, name);
  }
};

const normalizeOrigins = (rawOrigins, issues) => {
  const entries = String(rawOrigins).split(',');

  if (entries.some((entry) => !entry.trim())) {
    issues.push('CORS_ALLOWED_ORIGINS must not contain empty entries');
    return [];
  }

  const origins = entries
    .map((entry) => {
      return httpsOrigin(
        entry.trim(),
        issues,
        'CORS_ALLOWED_ORIGINS',
      );
    })
    .filter(Boolean);

  return [...new Set(origins)];
};

const validateSecret = (environment, issues, name) => {
  const value = required(environment, issues, name);

  if (value && value.length < SECRET_MIN_LENGTH) {
    issues.push(
      `${name} must be at least ${SECRET_MIN_LENGTH} characters`,
    );
  }

  return value;
};

const RATE_LIMIT_VARIABLES = [
  'AUTH_LOGIN_RATE_LIMIT_MAX',
  'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS',

  'AUTH_GOOGLE_RATE_LIMIT_MAX',
  'AUTH_GOOGLE_RATE_LIMIT_WINDOW_MS',

  'AUTH_REFRESH_RATE_LIMIT_MAX',
  'AUTH_REFRESH_RATE_LIMIT_WINDOW_MS',

  'AUTH_FORGOT_RATE_LIMIT_MAX',
  'AUTH_FORGOT_RATE_LIMIT_WINDOW_MS',

  'AUTH_RESET_RATE_LIMIT_MAX',
  'AUTH_RESET_RATE_LIMIT_WINDOW_MS',

  'ORDER_LOOKUP_RATE_LIMIT_MAX',
  'ORDER_LOOKUP_RATE_LIMIT_WINDOW_MS',

  'GUEST_ORDER_MANAGE_RATE_LIMIT_MAX',
  'GUEST_ORDER_MANAGE_RATE_LIMIT_WINDOW_MS',

  'GUEST_ORDER_CANCEL_RATE_LIMIT_MAX',
  'GUEST_ORDER_CANCEL_RATE_LIMIT_WINDOW_MS',

  'SUPPORT_MESSAGE_RATE_LIMIT_MINUTE_MAX',
  'SUPPORT_MESSAGE_RATE_LIMIT_MINUTE_WINDOW_MS',

  'SUPPORT_MESSAGE_RATE_LIMIT_HOUR_MAX',
  'SUPPORT_MESSAGE_RATE_LIMIT_HOUR_WINDOW_MS',

  'CONSULTATION_REQUEST_RATE_LIMIT_MAX',
  'CONSULTATION_REQUEST_RATE_LIMIT_WINDOW_MS',

  'UPLOAD_RATE_LIMIT_MAX',
  'UPLOAD_RATE_LIMIT_WINDOW_MS',
];

const REQUIRED_PRODUCTION_VARIABLES = [
  'GOOGLE_CLIENT_ID',

  'VNP_TMNCODE',
  'VNP_HASHSECRET',

  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',

  'RESEND_API_KEY',
  'EMAIL_FROM',
];

export const validateEnvironment = (
  environment = process.env,
) => {
  const production = environment.NODE_ENV === 'production';

  if (!production) {
    return {
      production: false,
      allowedOrigins: [],
    };
  }

  const issues = [];

  const databaseUrl = required(
    environment,
    issues,
    'DATABASE_URL',
  );

  if (
    databaseUrl
    && !databaseUrl.startsWith('sqlserver:')
  ) {
    issues.push(
      'DATABASE_URL must use the sqlserver protocol',
    );
  }

  const accessSecret = String(
    environment.JWT_ACCESS_SECRET
    || environment.JWT_SECRET
    || '',
  ).trim();

  if (!accessSecret) {
    issues.push(
      'JWT_ACCESS_SECRET or JWT_SECRET is required',
    );
  }

  if (
    accessSecret
    && accessSecret.length < SECRET_MIN_LENGTH
  ) {
    issues.push(
      'JWT_ACCESS_SECRET or JWT_SECRET must be at least 32 characters',
    );
  }

  const legacyJwt =
    !environment.JWT_ACCESS_SECRET
    && Boolean(environment.JWT_SECRET);

  validateSecret(
    environment,
    issues,
    'REFRESH_TOKEN_HASH_SECRET',
  );

  validateSecret(
    environment,
    issues,
    'METRICS_TOKEN',
  );

  const frontendUrl = required(
    environment,
    issues,
    'FRONTEND_URL',
  );

  const frontendOrigin = frontendUrl
    ? httpsOrigin(
      frontendUrl,
      issues,
      'FRONTEND_URL',
    )
    : null;

  const rawOrigins = required(
    environment,
    issues,
    'CORS_ALLOWED_ORIGINS',
  );

  const allowedOrigins = rawOrigins
    ? normalizeOrigins(rawOrigins, issues)
    : [];

  if (
    frontendOrigin
    && !allowedOrigins.includes(frontendOrigin)
  ) {
    issues.push(
      'CORS_ALLOWED_ORIGINS must include FRONTEND_URL origin',
    );
  }

  const trustProxyHops = positiveInteger(
    required(
      environment,
      issues,
      'TRUST_PROXY_HOPS',
    ),
    issues,
    'TRUST_PROXY_HOPS',
    {
      min: 1,
      max: 10,
    },
  );

  if (
    environment.PORT !== undefined
    && String(environment.PORT).trim() !== ''
  ) {
    positiveInteger(
      environment.PORT,
      issues,
      'PORT',
      {
        min: 1,
        max: 65535,
      },
    );
  }

  for (const name of REQUIRED_PRODUCTION_VARIABLES) {
    required(environment, issues, name);
  }

  for (const name of ['VNP_URL', 'VNP_RETURNURL']) {
    const value = required(
      environment,
      issues,
      name,
    );

    if (value) {
      httpsUrl(value, issues, name);
    }
  }

  if (
    environment.CONSULTATION_NOTIFY_EMAIL
    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      environment.CONSULTATION_NOTIFY_EMAIL,
    )
  ) {
    issues.push(
      'CONSULTATION_NOTIFY_EMAIL must be a valid email address',
    );
  }

  if (
    environment.PAYMENT_REFUND_ENV
    && !['sandbox', 'production'].includes(
      String(
        environment.PAYMENT_REFUND_ENV,
      ).toLowerCase(),
    )
  ) {
    issues.push(
      'PAYMENT_REFUND_ENV must be sandbox or production',
    );
  }

  const vnpayEnvironmentCheck =
    validateVNPayEnvironmentConfig(environment);

  if (!vnpayEnvironmentCheck.valid) {
    issues.push(vnpayEnvironmentCheck.issue);
  }

  for (const name of RATE_LIMIT_VARIABLES) {
    validateOptionalPositiveInteger(
      environment,
      issues,
      name,
    );
  }

  if (issues.length) {
    throw new EnvironmentValidationError(issues);
  }

  return {
    production: true,
    allowedOrigins,
    trustProxyHops,
    legacyJwt,
  };
};
