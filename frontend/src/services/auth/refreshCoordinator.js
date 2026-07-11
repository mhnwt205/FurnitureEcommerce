const LOCK_NAME = 'hh-auth-refresh';
const FALLBACK_LOCK_KEY = 'hh-auth-refresh-lock';
const REFRESH_TIMEOUT_MS = 10_000;
const FALLBACK_LEASE_MS = 15_000;
const FALLBACK_WAIT_TIMEOUT_MS = 20_000;
const FALLBACK_RETRY_MIN_MS = 80;
const FALLBACK_RETRY_JITTER_MS = 120;
const SESSION_FAILURE_SUPPRESSION_MS = 5_000;

let inFlightRefresh = null;
let suppressRefreshUntil = 0;

const createOwnerId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2);
  return `refresh-${Date.now()}-${random}`;
};

const tabOwnerId = createOwnerId();

const createSessionExpiredError = () => {
  const error = new Error('Session expired');
  error.status = 401;
  error.code = 'REFRESH_SESSION_EXPIRED';
  return error;
};

const assertRefreshAllowed = () => {
  if (Date.now() < suppressRefreshUntil) {
    throw createSessionExpiredError();
  }
};

export const markRefreshSessionExpired = () => {
  suppressRefreshUntil = Date.now() + SESSION_FAILURE_SUPPRESSION_MS;
};

export const clearRefreshSessionExpired = () => {
  suppressRefreshUntil = 0;
};

const getWebLocks = () => (
  typeof navigator !== 'undefined' && navigator.locks?.request
    ? navigator.locks
    : null
);

const getFallbackStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const readLease = (storage) => {
  try {
    const rawLease = storage.getItem(FALLBACK_LOCK_KEY);
    if (!rawLease) return null;

    const lease = JSON.parse(rawLease);
    if (!lease?.ownerId || !Number.isFinite(lease.expiresAt)) return null;
    return lease;
  } catch {
    return null;
  }
};

const tryAcquireFallbackLease = (storage) => {
  const now = Date.now();
  const currentLease = readLease(storage);

  if (currentLease && currentLease.ownerId !== tabOwnerId && currentLease.expiresAt > now) {
    return false;
  }

  const candidateLease = {
    ownerId: tabOwnerId,
    expiresAt: now + FALLBACK_LEASE_MS
  };

  try {
    storage.setItem(FALLBACK_LOCK_KEY, JSON.stringify(candidateLease));
    const confirmedLease = readLease(storage);
    return confirmedLease?.ownerId === tabOwnerId && confirmedLease.expiresAt === candidateLease.expiresAt;
  } catch {
    return false;
  }
};

const releaseFallbackLease = (storage) => {
  const currentLease = readLease(storage);
  if (currentLease?.ownerId !== tabOwnerId) return;

  try {
    storage.removeItem(FALLBACK_LOCK_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
};

const runRefreshWithTimeout = async (refreshFn) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller?.abort();
  }, REFRESH_TIMEOUT_MS);

  try {
    return await refreshFn({ signal: controller?.signal });
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error('Authentication refresh timed out');
      timeoutError.code = 'REFRESH_COORDINATION_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const runWithFallbackLease = async (refreshFn) => {
  const storage = getFallbackStorage();
  if (!storage) {
    return runRefreshWithTimeout(refreshFn);
  }

  const deadline = Date.now() + FALLBACK_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (tryAcquireFallbackLease(storage)) {
      try {
        assertRefreshAllowed();
        return await runRefreshWithTimeout(refreshFn);
      } finally {
        releaseFallbackLease(storage);
      }
    }

    const jitter = Math.floor(Math.random() * FALLBACK_RETRY_JITTER_MS);
    await sleep(FALLBACK_RETRY_MIN_MS + jitter);
  }

  const timeoutError = new Error('Authentication refresh coordination timed out');
  timeoutError.code = 'REFRESH_COORDINATION_TIMEOUT';
  throw timeoutError;
};

const runCrossTabRefresh = (refreshFn) => {
  const webLocks = getWebLocks();
  if (webLocks) {
    return webLocks.request(LOCK_NAME, { mode: 'exclusive' }, async () => {
      await sleep(25);
      assertRefreshAllowed();
      return runRefreshWithTimeout(refreshFn);
    });
  }

  return runWithFallbackLease(refreshFn);
};

export const runCoordinatedRefresh = (refreshFn) => {
  if (typeof refreshFn !== 'function') {
    return Promise.reject(new TypeError('refreshFn must be a function'));
  }

  if (!inFlightRefresh) {
    inFlightRefresh = runCrossTabRefresh(refreshFn).finally(() => {
      inFlightRefresh = null;
    });
  }

  return inFlightRefresh;
};

export const isRefreshInProgress = () => Boolean(inFlightRefresh);