import { clearAccessToken, getAccessToken, setAccessToken } from '../auth/accessTokenStore.js';
import { AUTH_EVENTS, emitAuthEvent } from '../auth/authEvents.js';
import {
  clearRefreshSessionExpired,
  markRefreshSessionExpired,
  runCoordinatedRefresh
} from '../auth/refreshCoordinator.js';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  '/auth/login',
  '/auth/google',
  '/auth/refresh',
  '/auth/logout',
  '/auth/logout-all'
];

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

const createApiError = (message, status, data) => {
  const error = new Error(message || 'An error occurred');
  error.status = status;
  error.data = data;
  return error;
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
  const token = getAccessToken();
  const headers = { ...(options.headers || {}) };

  if (options.body && !isFormData(options.body) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    credentials: options.credentials || 'include',
    headers
  };

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, config);
  } catch (error) {
    const apiError = createApiError('Network error', 0, null);
    apiError.cause = error;
    throw apiError;
  }

  const data = await parseResponseBody(response);

  if (response.status === 401 && !hasRetried && !shouldSkipRefresh(endpoint)) {
    await refreshAccessToken();
    return apiClient(endpoint, options, true);
  }

  if (!response.ok) {
    throw createApiError(data?.message || response.statusText || 'An error occurred', response.status, data);
  }

  return data;
};

export { API_URL, refreshAccessToken };
export default apiClient;
