import { aiErrorCodes } from './telemetry.schema.js';

const MODELS = new Set(['gemini-flash-latest']);
export const telemetryModel = (value) => MODELS.has(value) ? value : value ? 'custom' : 'unknown';
export const confidenceBucket = (value) => Number.isFinite(value) ? value < 0.5 ? 'low' : value < 0.8 ? 'medium' : 'high' : 'unknown';
export const classifyAiTelemetryError = (error) => {
  const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
  if (timeout) return 'provider_timeout';
  if (Number.isInteger(error?.status)) return 'provider_http_error';
  if (error?.name === 'ZodError' || error?.name === 'SyntaxError') return 'provider_invalid_output';
  return aiErrorCodes.includes(error?.code) ? error.code : 'unknown_error';
};
