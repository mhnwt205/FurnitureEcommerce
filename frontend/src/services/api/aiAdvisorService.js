import apiClient from './apiClient.js';

const RETRY_AFTER_DEFAULT_SECONDS = 60;
const RETRY_AFTER_MAX_SECONDS = 300;
const MAX_RECOMMENDATIONS = 5;
const MAX_ANSWER_LENGTH = 500;
const MAX_REASON_LENGTH = 240;
const RESPONSE_FIELDS = ['answer', 'recommendations'];
const RECOMMENDATION_FIELDS = [
  'id', 'name', 'slug', 'image', 'price', 'finalPrice', 'promotion',
  'stock', 'category', 'averageRating', 'reviewCount', 'reason'
];

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOnlyFields = (value, fields) => Object.keys(value).every((key) => fields.includes(key));
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export class AiAdvisorClientError extends Error {
  constructor({ code, status = 0, retryAfterSeconds = null }) {
    super('AI advisor request failed');
    this.name = 'AiAdvisorClientError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const parseAiAdvisorRetryAfter = (value, now = Date.now()) => {
  if (typeof value !== 'string' || !value.trim()) return RETRY_AFTER_DEFAULT_SECONDS;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(RETRY_AFTER_MAX_SECONDS, Math.max(1, Math.ceil(seconds)));

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt) || retryAt <= now) return RETRY_AFTER_DEFAULT_SECONDS;
  return Math.min(RETRY_AFTER_MAX_SECONDS, Math.max(1, Math.ceil((retryAt - now) / 1000)));
};

const normalizeContext = (context) => {
  if (context === undefined) return undefined;
  if (!isPlainObject(context)) throw new AiAdvisorClientError({ code: 'AI_ADVISOR_REQUEST_INVALID', status: 400 });
  const { currentProductId } = context;
  if (currentProductId === undefined) return undefined;
  if (!Number.isInteger(currentProductId) || currentProductId <= 0) {
    throw new AiAdvisorClientError({ code: 'AI_ADVISOR_REQUEST_INVALID', status: 400 });
  }
  return { currentProductId };
};

const normalizeRecommendation = (value) => {
  if (!isPlainObject(value) || !hasOnlyFields(value, RECOMMENDATION_FIELDS)) return null;
  if (!Number.isInteger(value.id) || value.id <= 0 || typeof value.name !== 'string' || typeof value.reason !== 'string' || !value.reason.trim() || value.reason.length > MAX_REASON_LENGTH) return null;
  if (value.slug !== null && typeof value.slug !== 'string') return null;
  if (value.image !== null && typeof value.image !== 'string') return null;
  if (!isFiniteNumber(value.price) || !isFiniteNumber(value.finalPrice) || !isFiniteNumber(value.stock)) return null;
  if (!isPlainObject(value.category) || !isFiniteNumber(value.averageRating) || !Number.isInteger(value.reviewCount) || value.reviewCount < 0) return null;
  if (value.promotion !== null && !isPlainObject(value.promotion)) return null;
  return value;
};

export const normalizeAiAdvisorResponse = (value) => {
  if (!isPlainObject(value) || !hasOnlyFields(value, RESPONSE_FIELDS) || typeof value.answer !== 'string' || !value.answer.trim() || value.answer.length > MAX_ANSWER_LENGTH || !Array.isArray(value.recommendations) || value.recommendations.length > MAX_RECOMMENDATIONS) {
    throw new AiAdvisorClientError({ code: 'AI_ADVISOR_RESPONSE_INVALID' });
  }

  const recommendations = value.recommendations.map(normalizeRecommendation);
  const ids = recommendations.map((item) => item?.id);
  if (recommendations.some((item) => item === null) || new Set(ids).size !== ids.length) throw new AiAdvisorClientError({ code: 'AI_ADVISOR_RESPONSE_INVALID' });
  return { answer: value.answer, recommendations };
};

const mapApiError = (error) => {
  if (error?.code === 'REQUEST_ABORTED' || error?.name === 'AbortError') return new AiAdvisorClientError({ code: 'AI_ADVISOR_ABORTED' });
  if (error?.status === 400) return new AiAdvisorClientError({ code: 'AI_ADVISOR_REQUEST_INVALID', status: 400 });
  if (error?.status === 429) {
    const retryAfterSeconds = Number.isSafeInteger(error?.retryAfterSeconds)
      ? Math.min(RETRY_AFTER_MAX_SECONDS, Math.max(1, error.retryAfterSeconds))
      : RETRY_AFTER_DEFAULT_SECONDS;
    return new AiAdvisorClientError({ code: 'AI_ADVISOR_RATE_LIMITED', status: 429, retryAfterSeconds });
  }
  if (error?.status === 500 || error?.status === 503) return new AiAdvisorClientError({ code: 'AI_ADVISOR_UNAVAILABLE', status: error.status });
  return new AiAdvisorClientError({ code: 'AI_ADVISOR_NETWORK_ERROR' });
};

export const sendAiAdvisorMessage = async ({ message, context, signal }) => {
  if (typeof message !== 'string') throw new AiAdvisorClientError({ code: 'AI_ADVISOR_REQUEST_INVALID', status: 400 });
  const normalizedContext = normalizeContext(context);
  const payload = normalizedContext === undefined ? { message } : { message, context: normalizedContext };

  try {
    const response = await apiClient('/ai-advisor/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal
    });
    return normalizeAiAdvisorResponse(response);
  } catch (error) {
    if (error instanceof AiAdvisorClientError) throw error;
    throw mapApiError(error);
  }
};

export const AI_ADVISOR_RETRY_AFTER_DEFAULT_SECONDS = RETRY_AFTER_DEFAULT_SECONDS;
export const AI_ADVISOR_RETRY_AFTER_MAX_SECONDS = RETRY_AFTER_MAX_SECONDS;
