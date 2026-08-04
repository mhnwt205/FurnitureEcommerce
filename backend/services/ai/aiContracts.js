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
  defaultProviderTimeoutMs: 7_000,
  defaultProviderMaxAttempts: 1,
  defaultRequestTotalTimeoutMs: 12_000,
  defaultStateResolverTimeoutMs: 3_000,
  defaultStateResolverMaxAttempts: 1,
  defaultRateLimitMax: 20,
  defaultRateLimitWindowMs: 300_000,
  messageMaxLength: 1_000,
  answerMaxLength: 500,
  reasonMaxLength: 240,
  minTimeoutMs: 15_000,
  maxTimeoutMs: 20_000,
  minProviderTimeoutMs: 1_000,
  maxProviderTimeoutMs: 15_000,
  minRequestTotalTimeoutMs: 3_000,
  maxRequestTotalTimeoutMs: 30_000,
  minStateResolverTimeoutMs: 1_000,
  maxStateResolverTimeoutMs: 5_000,
  minRateLimitMax: 1,
  maxRateLimitMax: 1_000,
  minRateLimitWindowMs: 1_000,
  maxRateLimitWindowMs: 3_600_000
  ,defaultConversationTtlMs: 1_200_000
  ,defaultConversationMaxEntries: 1_000
  ,defaultConversationMaxRecentTurns: 6
  ,defaultConversationMaxTotalChars: 1_800
  ,defaultConversationMaxTurnChars: 600
  ,minConversationTtlMs: 60_000
  ,maxConversationTtlMs: 3_600_000
  ,minConversationMaxEntries: 1
  ,maxConversationMaxEntries: 10_000
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
  defaultProviderTimeoutMs: AI_DEFAULT_PROVIDER_TIMEOUT_MS,
  defaultProviderMaxAttempts: AI_DEFAULT_PROVIDER_MAX_ATTEMPTS,
  defaultRequestTotalTimeoutMs: AI_DEFAULT_REQUEST_TOTAL_TIMEOUT_MS,
  defaultStateResolverTimeoutMs: AI_DEFAULT_STATE_RESOLVER_TIMEOUT_MS,
  defaultStateResolverMaxAttempts: AI_DEFAULT_STATE_RESOLVER_MAX_ATTEMPTS,
  defaultRateLimitMax: AI_DEFAULT_RATE_LIMIT_MAX,
  defaultRateLimitWindowMs: AI_DEFAULT_RATE_LIMIT_WINDOW_MS,
  messageMaxLength: AI_MESSAGE_MAX_LENGTH,
  answerMaxLength: AI_ANSWER_MAX_LENGTH,
  reasonMaxLength: AI_REASON_MAX_LENGTH,
  minTimeoutMs: AI_MIN_TIMEOUT_MS,
  maxTimeoutMs: AI_MAX_TIMEOUT_MS,
  minProviderTimeoutMs: AI_MIN_PROVIDER_TIMEOUT_MS,
  maxProviderTimeoutMs: AI_MAX_PROVIDER_TIMEOUT_MS,
  minRequestTotalTimeoutMs: AI_MIN_REQUEST_TOTAL_TIMEOUT_MS,
  maxRequestTotalTimeoutMs: AI_MAX_REQUEST_TOTAL_TIMEOUT_MS,
  minStateResolverTimeoutMs: AI_MIN_STATE_RESOLVER_TIMEOUT_MS,
  maxStateResolverTimeoutMs: AI_MAX_STATE_RESOLVER_TIMEOUT_MS,
  minRateLimitMax: AI_MIN_RATE_LIMIT_MAX,
  maxRateLimitMax: AI_MAX_RATE_LIMIT_MAX,
  minRateLimitWindowMs: AI_MIN_RATE_LIMIT_WINDOW_MS,
  maxRateLimitWindowMs: AI_MAX_RATE_LIMIT_WINDOW_MS
  ,defaultConversationTtlMs: AI_DEFAULT_CONVERSATION_TTL_MS
  ,defaultConversationMaxEntries: AI_DEFAULT_CONVERSATION_MAX_ENTRIES
  ,defaultConversationMaxRecentTurns: AI_DEFAULT_CONVERSATION_MAX_RECENT_TURNS
  ,defaultConversationMaxTotalChars: AI_DEFAULT_CONVERSATION_MAX_TOTAL_CHARS
  ,defaultConversationMaxTurnChars: AI_DEFAULT_CONVERSATION_MAX_TURN_CHARS
  ,minConversationTtlMs: AI_MIN_CONVERSATION_TTL_MS
  ,maxConversationTtlMs: AI_MAX_CONVERSATION_TTL_MS
  ,minConversationMaxEntries: AI_MIN_CONVERSATION_MAX_ENTRIES
  ,maxConversationMaxEntries: AI_MAX_CONVERSATION_MAX_ENTRIES
} = AI_CONSTANTS;

export const AI_ERROR_CODE = Object.freeze({
  requestValidation: 'AI_REQUEST_VALIDATION_ERROR',
  providerOutputInvalid: 'AI_PROVIDER_OUTPUT_INVALID',
  providerIdNotAllowed: 'AI_PROVIDER_ID_NOT_ALLOWED',
  configInvalid: 'AI_CONFIG_INVALID',
  promptBuild: 'AI_PROMPT_BUILD_ERROR',
  responseBuild: 'AI_RESPONSE_BUILD_ERROR',
  stateTransitionInvalid: 'AI_STATE_TRANSITION_INVALID'
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
export const AI_CONVERSATION_HEADER = 'X-AI-Conversation-Id';
export const AI_CONVERSATION_ID_PATTERN = /^[a-f0-9]{32}$/i;
const preferenceEnum = (values) => z.enum(values);
const profileShape = {
  productType: preferenceEnum(['chair', 'sofa', 'table', 'bed', 'cabinet', 'lamp']).nullable(),
  room: preferenceEnum(['dining_room', 'living_room', 'bedroom', 'office', 'cafe', 'apartment']).nullable(),
  budgetMin: z.number().int().nonnegative().nullable(),
  budgetMax: z.number().int().nonnegative().nullable(),
  household: z.array(preferenceEnum(['children', 'older_adults', 'pets', 'large_family'])).max(4),
  style: preferenceEnum(['modern', 'minimalist', 'scandinavian', 'classic', 'industrial']).nullable(),
  materials: z.array(preferenceEnum(['wood', 'metal', 'fabric', 'leather', 'rattan'])).max(5),
  colors: z.array(preferenceEnum(['white', 'black', 'brown', 'gray', 'beige', 'natural'])).max(6)
};
const profileFieldNames = ['productType', 'room', 'budgetMin', 'budgetMax', 'household', 'style', 'materials', 'colors'];
const profileValueSchema = z.object(profileShape).strict().superRefine((profile, context) => {
  if (profile.budgetMin !== null && profile.budgetMax !== null && profile.budgetMin > profile.budgetMax) context.addIssue({ code: 'custom', message: 'Conversation budget range is invalid' });
});
export const aiConversationIdSchema = z.string().max(32).regex(AI_CONVERSATION_ID_PATTERN);
export const aiConversationProfileSchema = profileValueSchema;
const transitionSetShape = {
  productType: preferenceEnum(['chair', 'sofa', 'table', 'bed', 'cabinet', 'lamp']),
  room: preferenceEnum(['dining_room', 'living_room', 'bedroom', 'office', 'cafe', 'apartment']),
  budgetMin: z.number().int().nonnegative(),
  budgetMax: z.number().int().nonnegative(),
  household: z.array(preferenceEnum(['children', 'older_adults', 'pets', 'large_family'])).max(4),
  style: preferenceEnum(['modern', 'minimalist', 'scandinavian', 'classic', 'industrial']),
  materials: z.array(preferenceEnum(['wood', 'metal', 'fabric', 'leather', 'rattan'])).max(5),
  colors: z.array(preferenceEnum(['white', 'black', 'brown', 'gray', 'beige', 'natural'])).max(6)
};
export const aiStateTransitionSchema = z.object({
  operation: z.enum(['refine', 'replace', 'reset']),
  clear: z.array(z.enum(profileFieldNames)).max(profileFieldNames.length),
  set: z.object(transitionSetShape).partial().strict()
}).strict().superRefine((transition, context) => {
  const setKeys = Object.entries(transition.set).filter(([, value]) => value !== undefined).map(([key]) => key);
  if (new Set(transition.clear).size !== transition.clear.length) context.addIssue({ code: 'custom', message: 'Transition clear fields must be unique' });
  for (const field of transition.clear) if (setKeys.includes(field)) context.addIssue({ code: 'custom', message: 'Transition cannot clear and set the same field' });
  if (transition.operation === 'reset' && (transition.clear.length || setKeys.length)) context.addIssue({ code: 'custom', message: 'Reset transition must be empty' });
  if (transition.set.budgetMin !== undefined && transition.set.budgetMax !== undefined && transition.set.budgetMin > transition.set.budgetMax) context.addIssue({ code: 'custom', message: 'Transition budget range is invalid' });
}).transform((transition) => ({ ...transition, set: Object.fromEntries(Object.entries(transition.set).filter(([, value]) => value !== undefined)) }));
export const aiConversationPatchSchema = z.object(profileShape).partial().extend({
  householdAdd: z.array(preferenceEnum(['children', 'older_adults', 'pets', 'large_family'])).max(4).optional(),
  householdRemove: z.array(preferenceEnum(['children', 'older_adults', 'pets', 'large_family'])).max(4).optional(),
  materialsRemove: z.array(preferenceEnum(['wood', 'metal', 'fabric', 'leather', 'rattan'])).max(5).optional(),
  colorsRemove: z.array(preferenceEnum(['white', 'black', 'brown', 'gray', 'beige', 'natural'])).max(6).optional(),
  explicitFields: z.array(z.enum(['productType', 'room', 'budgetMin', 'budgetMax', 'household', 'style', 'materials', 'colors'])).max(8).optional()
}).strict();

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
  recommendations: z.array(aiRecommendationSchema).max(AI_MAX_RECOMMENDATIONS),
  memoryPatch: aiConversationPatchSchema.optional()
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
