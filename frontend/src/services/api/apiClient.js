import { clearAccessToken, getAccessToken, setAccessToken } from '../auth/accessTokenStore.js';
import { AUTH_EVENTS, emitAuthEvent } from '../auth/authEvents.js';
import {
  clearRefreshSessionExpired,
  markRefreshSessionExpired,
  runCoordinatedRefresh
} from '../auth/refreshCoordinator.js';
import { API_URL } from '../../config/environment.js';

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  '/auth/login',
  '/auth/google',
  '/auth/refresh',
  '/auth/logout',
  '/auth/logout-all'
];

export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
export const DEFAULT_RETRY_AFTER_SECONDS = 60;
const MAX_RETRY_AFTER_SECONDS = 300;

export const parseRetryAfterSeconds = (value, now = Date.now()) => {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(MAX_RETRY_AFTER_SECONDS, Math.max(1, Math.ceil(seconds)));
  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt) || retryAt <= now) return DEFAULT_RETRY_AFTER_SECONDS;
  return Math.min(MAX_RETRY_AFTER_SECONDS, Math.max(1, Math.ceil((retryAt - now) / 1000)));
};

const isFormData = (value) => typeof FormData !== 'undefined' && value instanceof FormData;

const shouldSkipRefresh = (endpoint) => (
  AUTH_ENDPOINTS_WITHOUT_REFRESH.some(authEndpoint => endpoint.startsWith(authEndpoint))
);

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const createApiError = (message, status, data, code, retryAfterSeconds = null) => {
  const error = new Error(message || 'An error occurred');
  error.status = status;
  error.data = data;
  if (code) error.code = code;
  if (status === 429) error.retryAfterSeconds = Number.isSafeInteger(retryAfterSeconds) ? retryAfterSeconds : DEFAULT_RETRY_AFTER_SECONDS;
  return error;
};

const getRequestTimeout = (timeoutMs) => {
  if (timeoutMs === false || timeoutMs === 0) return null;
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_REQUEST_TIMEOUT_MS;
};

const createRequestSignal = (callerSignal, timeoutMs) => {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = getRequestTimeout(timeoutMs);
  let timeoutId = null;

  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  if (timeout) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      callerSignal?.removeEventListener('abort', abortFromCaller);
    }
  };
};

const performRefresh = async ({ signal } = {}) => {
  let response;

  try {
    response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal
    });
  } catch {
    emitAuthEvent(AUTH_EVENTS.UNAVAILABLE);
    throw createApiError('Authentication service unavailable', 0, null);
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    markRefreshSessionExpired();
    clearAccessToken();
    emitAuthEvent(AUTH_EVENTS.SESSION_EXPIRED);
    throw createApiError(data?.message || 'Session expired', response.status, data);
  }

  const nextToken = data?.accessToken || data?.token;
  if (!nextToken) {
    markRefreshSessionExpired();
    clearAccessToken();
    emitAuthEvent(AUTH_EVENTS.SESSION_EXPIRED);
    throw createApiError('Session expired', 401, data);
  }

  clearRefreshSessionExpired();
  setAccessToken(nextToken);
  emitAuthEvent(AUTH_EVENTS.AUTHENTICATED, {
    user: data.user || null,
    accessToken: nextToken
  });
  return data;
};

const refreshAccessToken = () => runCoordinatedRefresh(performRefresh);

const apiClient = async (endpoint, options = {}, hasRetried = false) => {
  const { signal: callerSignal, timeoutMs, ...requestOptions } = options;
  const token = getAccessToken();
  const headers = { ...(requestOptions.headers || {}) };

  if (requestOptions.body && !isFormData(requestOptions.body) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestSignal = createRequestSignal(callerSignal, timeoutMs);
  const config = {
    ...requestOptions,
    credentials: options.credentials || 'include',
    headers,
    signal: requestSignal.signal
  };

  let response;
  let data;
  try {
    response = await fetch(`${API_URL}${endpoint}`, config);
    data = await parseResponseBody(response);
  } catch {
    if (requestSignal.timedOut()) {
      throw createApiError('Request timed out. Please try again.', 0, null, 'REQUEST_TIMEOUT');
    }

    if (callerSignal?.aborted || requestSignal.signal.aborted) {
      throw createApiError('Request was cancelled.', 0, null, 'REQUEST_ABORTED');
    }

    throw createApiError('Network error', 0, null, 'NETWORK_ERROR');
  } finally {
    requestSignal.cleanup();
  }

  if (response.status === 401 && !hasRetried && !shouldSkipRefresh(endpoint)) {
    await refreshAccessToken();
    return apiClient(endpoint, options, true);
  }

  if (!response.ok) {
    throw createApiError(data?.error?.message || data?.message || response.statusText || 'An error occurred', response.status, data, undefined, response.status === 429 ? parseRetryAfterSeconds(response.headers.get('Retry-After')) : null);
  }

  return data;
};

export { API_URL, refreshAccessToken };
export default apiClient;
