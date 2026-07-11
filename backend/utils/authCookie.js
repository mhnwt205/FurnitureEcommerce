import { getRefreshTokenMaxAgeMs } from './tokenService.js';

const DEFAULT_COOKIE_NAME = 'hh_refresh';
const DEFAULT_COOKIE_PATH = '/api/auth';

const parseBooleanEnv = (value) => {
  if (value === undefined) return undefined;
  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
};

const normalizeSameSite = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (['lax', 'strict', 'none'].includes(normalized)) {
    return normalized;
  }
  return undefined;
};

export const getRefreshCookieName = () => (
  process.env.REFRESH_COOKIE_NAME || DEFAULT_COOKIE_NAME
);

export const getRefreshCookieOptions = () => {
  const production = process.env.NODE_ENV === 'production';
  const secure = production
    ? true
    : parseBooleanEnv(process.env.COOKIE_SECURE) ?? false;
  const sameSite = production
    ? 'none'
    : normalizeSameSite(process.env.COOKIE_SAME_SITE) || 'lax';

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: DEFAULT_COOKIE_PATH,
    maxAge: getRefreshTokenMaxAgeMs()
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};

export const setRefreshCookie = (res, rawToken) => {
  res.cookie(getRefreshCookieName(), rawToken, getRefreshCookieOptions());
};

export const clearRefreshCookie = (res) => {
  const { maxAge, ...options } = getRefreshCookieOptions();
  res.clearCookie(getRefreshCookieName(), options);
};
export const parseCookies = (cookieHeader = '') => {
  return String(cookieHeader)
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return cookies;

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1);
      if (!name) return cookies;

      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }

      return cookies;
    }, {});
};

export const getRefreshTokenFromRequest = (req) => {
  const cookies = parseCookies(req.headers?.cookie);
  return cookies[getRefreshCookieName()] || null;
};