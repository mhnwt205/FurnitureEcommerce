import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEnvironment, EnvironmentValidationError } from '../config/env.js';
import { requestContext } from '../middlewares/requestContext.middleware.js';

const productionEnvironment = () => ({
  NODE_ENV: 'production', DATABASE_URL: 'sqlserver://localhost;database=app', JWT_ACCESS_SECRET: 'a'.repeat(32), REFRESH_TOKEN_HASH_SECRET: 'b'.repeat(32), FRONTEND_URL: 'https://app.example.com', CORS_ALLOWED_ORIGINS: 'https://app.example.com', TRUST_PROXY_HOPS: '1', GOOGLE_CLIENT_ID: 'client-id', VNP_TMNCODE: 'terminal', VNP_HASHSECRET: 'hash-secret', VNP_URL: 'https://pay.example.com', VNP_RETURNURL: 'https://api.example.com/payment-result', CLOUDINARY_CLOUD_NAME: 'cloud', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret', GEMINI_API_KEY: 'gemini', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '587', SMTP_USER: 'user', SMTP_PASS: 'pass', SMTP_FROM: 'noreply@example.com'
});

test('environment validator accepts complete production configuration', () => {
  assert.equal(validateEnvironment(productionEnvironment()).production, true);
});

test('environment validator rejects weak secrets without exposing their values', () => {
  const environment = productionEnvironment();
  environment.JWT_ACCESS_SECRET = 'weak-secret';
  assert.throws(() => validateEnvironment(environment), (error) => error instanceof EnvironmentValidationError && error.message.includes('JWT_ACCESS_SECRET') && !error.message.includes('weak-secret'));
});

test('environment validator accepts only strict HTTPS origins and deduplicates them', () => {
  const environment = productionEnvironment();
  environment.CORS_ALLOWED_ORIGINS = 'https://app.example.com, https://app.example.com,https://admin.example.com:443';
  const configuration = validateEnvironment(environment);
  assert.deepEqual(configuration.allowedOrigins, ['https://app.example.com', 'https://admin.example.com']);
});

for (const [label, value] of [
  ['empty entry', 'https://app.example.com,'],
  ['path', 'https://app.example.com/app'],
  ['query', 'https://app.example.com?x=1'],
  ['fragment', 'https://app.example.com/#section'],
  ['username', 'https://user@app.example.com'],
  ['password', 'https://user:password@app.example.com'],
  ['HTTP scheme', 'http://app.example.com']
]) {
  test(`environment validator rejects CORS origin ${label}`, () => {
    const environment = productionEnvironment();
    environment.CORS_ALLOWED_ORIGINS = value;
    assert.throws(() => validateEnvironment(environment), EnvironmentValidationError);
  });
}

test('environment validator rejects a malformed CORS origin without echoing it', () => {
  const environment = productionEnvironment();
  const malformedOrigin = 'https://[not-a-valid-host';
  environment.CORS_ALLOWED_ORIGINS = malformedOrigin;
  assert.throws(() => validateEnvironment(environment), (error) => (
    error instanceof EnvironmentValidationError
    && error.message.includes('CORS_ALLOWED_ORIGINS must be an absolute HTTPS URL')
    && !error.message.includes(malformedOrigin)
  ));
});

test('environment validator rejects malformed positive integers and bypasses production-only rules outside production', () => {
  const environment = productionEnvironment();
  environment.AI_ADVISOR_RATE_LIMIT_MAX = '0';
  environment.UPLOAD_RATE_LIMIT_WINDOW_MS = '-1';
  assert.throws(() => validateEnvironment(environment), EnvironmentValidationError);
  assert.deepEqual(validateEnvironment({ NODE_ENV: 'test' }), { production: false, allowedOrigins: [] });
});

test('request context accepts a valid request ID and replaces malformed values', () => {
  const invoke = (incoming) => {
    const headers = {};
    const req = { get: () => incoming };
    const res = { setHeader: (name, value) => { headers[name] = value; } };
    requestContext(req, res, () => {});
    return { req, headers };
  };
  const accepted = invoke('valid-request-id');
  assert.equal(accepted.req.requestId, 'valid-request-id');
  assert.equal(accepted.headers['X-Request-Id'], 'valid-request-id');
  const generated = invoke('bad id');
  assert.match(generated.req.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(generated.headers['X-Request-Id'], generated.req.requestId);
});
