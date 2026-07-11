export const AUTH_EVENTS = Object.freeze({
  AUTHENTICATED: 'auth:authenticated',
  SESSION_EXPIRED: 'auth:session-expired',
  UNAVAILABLE: 'auth:unavailable'
});

const listeners = new Set();

export const emitAuthEvent = (type, payload = {}) => {
  listeners.forEach((listener) => listener({ type, payload }));
};

export const subscribeAuthEvents = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
