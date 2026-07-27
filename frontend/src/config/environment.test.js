import { afterEach, describe, expect, it, vi } from 'vitest';

const loadEnvironment = async ({ apiUrl, googleClientId } = {}) => {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', apiUrl ?? '');
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', googleClientId ?? '');
  return import('./environment.js');
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('environment configuration', () => {
  it('normalizes the API URL and derives the static file base URL', async () => {
    const environment = await loadEnvironment({ apiUrl: '  https://api.example.com/api/  ' });

    expect(environment.API_URL).toBe('https://api.example.com/api');
    expect(environment.STATIC_FILE_BASE_URL).toBe('https://api.example.com');
  });

  it('rejects a missing required API URL', async () => {
    await expect(loadEnvironment()).rejects.toThrow('Missing required VITE_API_URL');
  });

  it('rejects an API URL with an unsupported protocol', async () => {
    await expect(loadEnvironment({ apiUrl: 'ftp://api.example.com' })).rejects.toThrow('must be an absolute http(s) URL');
  });

  it('keeps Google OAuth optional', async () => {
    const environment = await loadEnvironment({ apiUrl: 'https://api.example.com' });

    expect(environment.GOOGLE_CLIENT_ID).toBeNull();
  });
});
