import { z } from 'zod';
import { AI_CATEGORIES, AI_INTENT_TYPES } from '../intent/intent.taxonomy.js';
import { noResultReasons } from '../candidates/summary.schema.js';

export const aiTelemetryEventNames = [
  'ai_request_started', 'ai_request_completed', 'ai_request_failed', 'ai_intent_extracted', 'ai_intent_fallback',
  'ai_session_created', 'ai_session_reused', 'ai_session_reset', 'ai_session_evicted', 'ai_session_stale_commit_prevented',
  'ai_clarification_returned', 'ai_terminal_no_result', 'ai_relaxation_proposed', 'ai_relaxation_accepted', 'ai_relaxation_rejected',
  'ai_recommendation_returned', 'ai_provider_attempt', 'ai_provider_fallback', 'ai_provider_failed',
  'ai_candidate_pipeline_completed', 'ai_idempotency_cache_hit', 'ai_rate_limit_rejected'
];

export const aiOutcomes = ['recommendation', 'clarification', 'relaxation_proposal', 'terminal_no_result', 'rejected_relaxation', 'invalid_request', 'provider_fallback_success', 'failed'];
export const aiErrorCodes = ['validation_error', 'session_error', 'retrieval_error', 'provider_timeout', 'provider_http_error', 'provider_invalid_output', 'response_schema_error', 'stale_session', 'unknown_error'];
const provider = z.enum(['gemini', 'none', 'unknown']);
const model = z.enum(['gemini-flash-latest', 'custom', 'unknown']);

export const aiTelemetryMetadataSchema = z.object({
  messageLength: z.number().int().min(0).max(1000).optional(),
  intentType: z.enum(AI_INTENT_TYPES).optional(), confidenceBucket: z.enum(['low', 'medium', 'high', 'unknown']).optional(), category: z.enum(AI_CATEGORIES).nullable().optional(),
  candidateCount: z.number().int().min(0).max(50).optional(), primaryCount: z.number().int().min(0).max(50).optional(), retrievedCount: z.number().int().min(0).max(50).optional(), rankedCount: z.number().int().min(0).max(50).optional(), selectedCount: z.number().int().min(0).max(5).optional(), recommendationCount: z.number().int().min(0).max(5).optional(),
  clarificationField: z.enum(['category', 'budget', 'room', 'style', 'size', 'colors', 'materials', 'conflict', 'relaxation']).nullable().optional(), reasonCode: z.enum(noResultReasons).nullable().optional(), fallbackReason: z.enum(['none', 'primary_empty_category_fallback', 'primary_empty_keyword_fallback', 'primary_empty_all_active_fallback', 'unknown']).nullable().optional(),
  provider: provider.optional(), model: model.optional(), providerOperation: z.enum(['nlu', 'writer']).optional(), attempt: z.number().int().min(1).max(2).optional(), retryCount: z.number().int().min(0).max(1).optional(), errorCode: z.enum(aiErrorCodes).optional(), httpStatus: z.number().int().min(100).max(599).optional(), timeout: z.boolean().optional(),
  fallbackUsed: z.boolean().optional(), diversificationApplied: z.boolean().optional(), writerUsed: z.boolean().optional(), writerFallbackUsed: z.boolean().optional(), groundedReasonFallbackCount: z.number().int().min(0).max(5).optional(), sessionAction: z.enum(['created', 'reused', 'reset', 'expired', 'rotated', 'capacity']).optional(), retryAfterSeconds: z.number().int().min(1).max(300).optional()
}).strict();

export const aiTelemetryEventSchema = z.object({
  eventName: z.enum(aiTelemetryEventNames), timestamp: z.string().datetime(), requestId: z.string().uuid().nullable(), sessionId: z.string().uuid().nullable(), userId: z.number().int().positive().nullable(), ownerType: z.enum(['guest', 'authenticated']), durationMs: z.number().finite().min(0).max(120000).nullable(), outcome: z.enum(aiOutcomes).nullable(), metadata: aiTelemetryMetadataSchema
}).strict();
