export const REFRESH_TOKEN_ERROR_CODES = Object.freeze({
  MISSING: 'REFRESH_TOKEN_MISSING',
  INVALID: 'REFRESH_TOKEN_INVALID',
  EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  REVOKED: 'REFRESH_TOKEN_REVOKED',
  REUSE: 'REFRESH_TOKEN_REUSE',
  USER_INACTIVE: 'USER_INACTIVE'
});

export class AuthTokenError extends Error {
  constructor(code, message = 'Refresh token is invalid') {
    super(message);
    this.name = 'AuthTokenError';
    this.code = code;
  }
}
