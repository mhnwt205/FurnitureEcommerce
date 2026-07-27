import { afterEach, describe, expect, it, vi } from 'vitest';

const loadLogger = async (isDev) => {
  vi.resetModules();
  vi.stubEnv('DEV', isDev);
  return (await import('./clientLogger.js')).default;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('clientLogger', () => {
  it('is silent in production', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = await loadLogger(false);

    logger.error('request_failed', new Error('sensitive message'));

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not throw when console is unavailable', async () => {
    vi.stubGlobal('console', undefined);
    const logger = await loadLogger(true);

    expect(() => logger.error('request_failed', new Error('failed'))).not.toThrow();
  });

  it('falls back to console.log when the selected method is missing', async () => {
    const log = vi.fn();
    vi.stubGlobal('console', { log });
    const logger = await loadLogger(true);

    logger.error('request_failed', { message: 'failed', code: 'REQUEST_FAILED', status: 500, data: { token: 'hidden' } });

    expect(log).toHaveBeenCalledWith('[client] request_failed', {
      message: 'failed',
      code: 'REQUEST_FAILED',
      status: 500
    });
  });

  it('logs only the minimal diagnostic fields in development', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = await loadLogger(true);

    logger.error('request_failed', { message: 'contact jane@example.com', code: 'REQUEST_FAILED', status: 400, data: { accessToken: 'hidden' } });

    expect(errorSpy).toHaveBeenCalledWith('[client] request_failed', {
      message: 'contact [REDACTED_EMAIL]',
      code: 'REQUEST_FAILED',
      status: 400
    });
  });
});
