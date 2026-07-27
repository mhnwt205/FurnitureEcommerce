const getRequiredEnvironmentVariable = (name) => {
  const value = import.meta.env[name]?.trim();

  if (!value) {
    throw new Error(`[environment] Missing required ${name}. Configure it before starting the frontend.`);
  }

  return value;
};

const getOptionalEnvironmentVariable = (name) => import.meta.env[name]?.trim() || null;

const getApiUrl = () => {
  const apiUrl = getRequiredEnvironmentVariable('VITE_API_URL');

  try {
    const parsedUrl = new URL(apiUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new Error('[environment] VITE_API_URL must be an absolute http(s) URL.');
  }

  return apiUrl.replace(/\/+$/, '');
};

export const API_URL = getApiUrl();
export const GOOGLE_CLIENT_ID = getOptionalEnvironmentVariable('VITE_GOOGLE_CLIENT_ID');
export const STATIC_FILE_BASE_URL = API_URL.replace(/\/api\/?$/, '');
