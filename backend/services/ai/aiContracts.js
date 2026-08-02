import { z } from 'zod';

export const AI_CONSTANTS = Object.freeze({
  defaultMaxCandidates: 20,
  hardMaxCandidates: 30,
  candidateCatalogMaxChars: 30_000,
  totalPromptMaxChars: 40_000,
  maxRecommendations: 5,
  maxSearchKeywords: 8,
  promptVersion: 'AI_ADVISOR_V2',
  knowledgeVersion: 'HK_V1',
  outputContractVersion: '1',
  defaultTimeoutMs: 18_000,
  defaultRateLimitMax: 20,
  defaultRateLimitWindowMs: 300_000,
  messageMaxLength: 1_000,
  answerMaxLength: 500,
  reasonMaxLength: 240,
  minTimeoutMs: 15_000,
  maxTimeoutMs: 20_000,
  minRateLimitMax: 1,
  maxRateLimitMax: 1_000,
  minRateLimitWindowMs: 1_000,
  maxRateLimitWindowMs: 3_600_000
});

export const {
  defaultMaxCandidates: AI_DEFAULT_MAX_CANDIDATES,
  hardMaxCandidates: AI_HARD_MAX_CANDIDATES,
  candidateCatalogMaxChars: AI_CANDIDATE_CATALOG_MAX_CHARS,
  totalPromptMaxChars: AI_TOTAL_PROMPT_MAX_CHARS,
  maxRecommendations: AI_MAX_RECOMMENDATIONS,
  maxSearchKeywords: AI_MAX_SEARCH_KEYWORDS,
  promptVersion: AI_PROMPT_VERSION,
  knowledgeVersion: AI_KNOWLEDGE_VERSION,
  outputContractVersion: AI_OUTPUT_CONTRACT_VERSION,
  defaultTimeoutMs: AI_DEFAULT_TIMEOUT_MS,
  defaultRateLimitMax: AI_DEFAULT_RATE_LIMIT_MAX,
  defaultRateLimitWindowMs: AI_DEFAULT_RATE_LIMIT_WINDOW_MS,
  messageMaxLength: AI_MESSAGE_MAX_LENGTH,
  answerMaxLength: AI_ANSWER_MAX_LENGTH,
  reasonMaxLength: AI_REASON_MAX_LENGTH,
  minTimeoutMs: AI_MIN_TIMEOUT_MS,
  maxTimeoutMs: AI_MAX_TIMEOUT_MS,
  minRateLimitMax: AI_MIN_RATE_LIMIT_MAX,
  maxRateLimitMax: AI_MAX_RATE_LIMIT_MAX,
  minRateLimitWindowMs: AI_MIN_RATE_LIMIT_WINDOW_MS,
  maxRateLimitWindowMs: AI_MAX_RATE_LIMIT_WINDOW_MS
} = AI_CONSTANTS;

export const AI_ERROR_CODE = Object.freeze({
  requestValidation: 'AI_REQUEST_VALIDATION_ERROR',
  providerOutputInvalid: 'AI_PROVIDER_OUTPUT_INVALID',
  providerIdNotAllowed: 'AI_PROVIDER_ID_NOT_ALLOWED',
  configInvalid: 'AI_CONFIG_INVALID',
  promptBuild: 'AI_PROMPT_BUILD_ERROR',
  responseBuild: 'AI_RESPONSE_BUILD_ERROR'
});

export const AI_FALLBACK_REASON = Object.freeze({
  none: 'NONE',
  primaryEmpty: 'PRIMARY_EMPTY',
  primaryInsufficient: 'PRIMARY_INSUFFICIENT',
  generalActiveFallback: 'GENERAL_ACTIVE_FALLBACK'
});

export class AiContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AiContractError';
    this.code = code;
  }
}

const productIdSchema = z.number().int().positive();

export const aiAllowedCandidateIdsSchema = z.array(productIdSchema).superRefine((ids, context) => {
  const uniqueIds = new Set();
  for (const id of ids) {
    if (uniqueIds.has(id)) {
      context.addIssue({ code: 'custom', message: 'Candidate allow-list IDs must be unique' });
      return;
    }
    uniqueIds.add(id);
  }
});

export const aiChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(AI_MESSAGE_MAX_LENGTH),
  context: z.object({
    currentProductId: productIdSchema.optional()
  }).strict().optional()
}).strict();

const aiRecommendationSchema = z.object({
  id: productIdSchema,
  reason: z.string().trim().min(1).max(AI_REASON_MAX_LENGTH)
}).strict();

export const aiProviderResponseSchema = z.object({
  answer: z.string().trim().min(1).max(AI_ANSWER_MAX_LENGTH),
  recommendations: z.array(aiRecommendationSchema).max(AI_MAX_RECOMMENDATIONS)
}).strict().superRefine((result, context) => {
  const ids = new Set();
  for (const recommendation of result.recommendations) {
    if (ids.has(recommendation.id)) {
      context.addIssue({ code: 'custom', message: 'Recommendation IDs must be unique' });
      return;
    }
    ids.add(recommendation.id);
  }
});
