export class AiOverallDeadlineExceeded extends Error {
  constructor() {
    super('AI request deadline exceeded');
    this.name = 'AiOverallDeadlineExceeded';
    this.code = 'AI_REQUEST_DEADLINE_EXCEEDED';
  }
}

// One deadline is created per request. It owns no background work: every timer
// is cleared in finally, and the losing promise in run() remains observed by
// Promise.race so a late rejection cannot become unhandled.
export const createAiRequestDeadline = ({ timeoutMs, now = Date.now, setTimeoutImpl = setTimeout, clearTimeoutImpl = clearTimeout }) => {
  const startedAt = now();
  const expiresAt = startedAt + timeoutMs;
  const remainingMs = () => Math.max(0, expiresAt - now());
  const assertRemaining = () => {
    if (remainingMs() <= 0) throw new AiOverallDeadlineExceeded();
  };
  const capTimeout = (requestedMs) => {
    assertRemaining();
    return Math.max(1, Math.min(requestedMs, remainingMs()));
  };
  const run = async (operation) => {
    assertRemaining();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeoutImpl(() => reject(new AiOverallDeadlineExceeded()), remainingMs());
    });
    try {
      return await Promise.race([Promise.resolve().then(operation), timeout]);
    } finally {
      clearTimeoutImpl(timer);
    }
  };
  return Object.freeze({ startedAt, expiresAt, remainingMs, assertRemaining, capTimeout, run });
};
