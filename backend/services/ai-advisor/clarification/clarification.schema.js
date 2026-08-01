import { z } from 'zod';

export const clarificationFields = ['category', 'budget', 'room', 'style', 'size', 'colors', 'materials', 'conflict', 'relaxation'];
export const clarificationReasonCodes = ['missing_category', 'ambiguous_category', 'conflicting_constraints', 'candidate_set_too_broad', 'no_candidate', 'low_confidence', 'optional_refinement', 'sufficient_information', 'missing_comparative_reference'];
export const clarificationDecisionSchema = z.object({
  action: z.enum(['clarify', 'recommend', 'recommend_and_refine', 'no_result_refinement']),
  field: z.enum(clarificationFields).nullable(),
  reasonCode: z.enum(clarificationReasonCodes),
  question: z.object({ text: z.string().max(300), options: z.array(z.string().max(100)).max(6) }).strict().nullable(),
  confidence: z.number().min(0).max(1),
  candidateCount: z.number().int().nonnegative().nullable()
}).strict();

export const clarificationPolicyInputSchema = z.object({
  intent: z.object({ category: z.string().nullable(), budget: z.object({ min: z.number().int().nullable(), max: z.number().int().nullable() }).passthrough(), confidence: z.number().min(0).max(1), colors: z.array(z.string()).optional(), materials: z.array(z.string()).optional() }).passthrough(),
  candidateCount: z.number().int().nonnegative().nullable(), consecutiveClarificationCount: z.number().int().nonnegative(), askedFields: z.array(z.enum(clarificationFields)).max(9), conflicts: z.array(z.string()).max(10), noResultReasons: z.array(z.string()).max(10)
}).strict();

const sessionSchema = z.object({ isNew: z.boolean(), turnCount: z.number().int().nonnegative(), expiresAt: z.string().datetime() }).strict();
const baseResponse = { answer: z.string(), recommendations: z.array(z.unknown()), sessionId: z.string().uuid(), session: sessionSchema };
export const recommendationResponseSchema = z.object({ ...baseResponse, type: z.literal('recommendation'), canRefine: z.boolean() }).strict();
export const clarificationResponseSchema = z.object({ ...baseResponse, type: z.literal('clarification'), recommendations: z.array(z.unknown()).length(0), question: z.object({ field: z.enum(clarificationFields), text: z.string().min(1).max(300), options: z.array(z.string().max(100)).max(6) }).strict() }).strict();
export const terminalNoResultResponseSchema = z.object({ ...baseResponse, type: z.literal('no_result'), recommendations: z.array(z.unknown()).length(0), terminal: z.literal(true) }).strict();
export const relaxationProposalResponseSchema = z.object({ ...baseResponse, type:z.literal('relaxation_proposal'), recommendations:z.array(z.unknown()).length(0), relaxation:z.object({proposalId:z.string().max(40),reasonCode:z.string(),options:z.array(z.object({id:z.string().max(40),label:z.string().max(240)}).strict()).min(1).max(3)}).strict() }).strict();
export const aiAdvisorConversationResponseSchema = z.union([recommendationResponseSchema, clarificationResponseSchema, terminalNoResultResponseSchema, relaxationProposalResponseSchema]);
