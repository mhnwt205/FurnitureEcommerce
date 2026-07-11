import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/api/authService.js';
import { clearAccessToken, setAccessToken } from '../services/auth/accessTokenStore.js';
import { clearRefreshSessionExpired, markRefreshSessionExpired } from '../services/auth/refreshCoordinator.js';
import { AUTH_EVENTS, subscribeAuthEvents } from '../services/auth/authEvents.js';
import {
  AUTH_BROADCAST_EVENTS,
  broadcastAuthEvent,
  closeAuthBroadcast,
  subscribeAuthBroadcast
} from '../services/auth/authBroadcast.js';

const AuthContext = createContext(null);

const getTokenFromResponse = (response) => response?.accessToken || response?.token || null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('initializing');
  const [error, setError] = useState('');

  const applySession = useCallback((response) => {
    const token = getTokenFromResponse(response);
    const nextUser = response?.user || null;

    if (!token || !nextUser) {
      clearAccessToken();
      setUser(null);
      setAuthStatus('unauthenticated');
      setError('');
      return null;
    }

    clearRefreshSessionExpired();
    setAccessToken(token);
    setUser(nextUser);
    setAuthStatus('authenticated');
    setError('');
    return nextUser;
  }, []);

  const clearSession = useCallback((broadcast = true) => {
    clearAccessToken();
    setUser(null);
    setAuthStatus('unauthenticated');
    setError('');
    if (broadcast) broadcastAuthEvent(AUTH_BROADCAST_EVENTS.LOGOUT);
  }, []);

  const markUnavailable = useCallback((message = 'Authentication service unavailable') => {
    clearAccessToken();
    setUser(null);
    setAuthStatus('unavailable');
    setError(message);
  }, []);

  const refreshSession = useCallback(async () => {
    setAuthStatus('initializing');
    setUser(null);
    setError('');
    clearAccessToken();

    try {
      const response = await authService.refresh();
      return applySession(response);
    } catch (sessionError) {
      clearAccessToken();
      setUser(null);

      if (sessionError.status === 401 || sessionError.status === 403) {
        setAuthStatus('unauthenticated');
        setError('');
        broadcastAuthEvent(AUTH_BROADCAST_EVENTS.SESSION_EXPIRED);
        return null;
      }

      setAuthStatus('unavailable');
      setError(sessionError.message || 'Authentication service unavailable');
      return null;
    }
  }, [applySession]);

  const setSession = useCallback((tokenOrResponse, nextUser) => {
    if (typeof tokenOrResponse === 'object' && tokenOrResponse !== null) {
      return applySession(tokenOrResponse);
    }

    return applySession({
      accessToken: tokenOrResponse,
      user: nextUser
    });
  }, [applySession]);

  const updateCurrentUser = useCallback((updatedUser) => {
    if (!updatedUser) return;
    setUser((currentUser) => currentUser ? { ...currentUser, ...updatedUser } : currentUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (logoutError) {
      if (logoutError.status !== 0) {
        setError(logoutError.message || 'Logout failed');
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    try {
      await authService.logoutAll();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => subscribeAuthEvents(({ type, payload }) => {
    if (type === AUTH_EVENTS.AUTHENTICATED) {
      applySession(payload);
      return;
    }

    if (type === AUTH_EVENTS.SESSION_EXPIRED) {
      markRefreshSessionExpired();
      clearSession(false);
      broadcastAuthEvent(AUTH_BROADCAST_EVENTS.SESSION_EXPIRED);
      return;
    }

    if (type === AUTH_EVENTS.UNAVAILABLE) {
      markUnavailable();
    }
  }), [applySession, clearSession, markUnavailable]);

  useEffect(() => subscribeAuthBroadcast((type) => {
    if (type === AUTH_BROADCAST_EVENTS.LOGOUT || type === AUTH_BROADCAST_EVENTS.SESSION_EXPIRED) {
      if (type === AUTH_BROADCAST_EVENTS.SESSION_EXPIRED) markRefreshSessionExpired();
      clearSession(false);
    }
  }), [clearSession]);

  useEffect(() => () => closeAuthBroadcast(), []);

  const value = useMemo(() => ({
    user,
    status: authStatus,
    authStatus,
    error,
    isChecking: authStatus === 'initializing',
    isAuthenticated: authStatus === 'authenticated' && Boolean(user),
    isUnavailable: authStatus === 'unavailable',
    refreshSession,
    verifySession: refreshSession,
    setSession,
    updateCurrentUser,
    clearSession,
    logout,
    logoutAll
  }), [user, authStatus, error, refreshSession, setSession, updateCurrentUser, clearSession, logout, logoutAll]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}