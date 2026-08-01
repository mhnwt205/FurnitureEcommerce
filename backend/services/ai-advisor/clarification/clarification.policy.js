import { clarificationDecisionSchema, clarificationPolicyInputSchema } from './clarification.schema.js';
import { buildClarificationQuestion } from './question.service.js';
const BROAD = 20;
const decision = (action, field, reasonCode, input) => clarificationDecisionSchema.parse({ action, field, reasonCode, question: field ? buildClarificationQuestion(field) : null, confidence: input.intent.confidence, candidateCount: input.candidateCount });
export const decideClarification = (rawInput) => {
  const input = clarificationPolicyInputSchema.parse(rawInput);
  const capped = input.consecutiveClarificationCount >= 2;
  if (input.noResultReasons.includes('missing_comparative_reference')) return capped ? decision('recommend', null, 'sufficient_information', input) : decision('clarify', 'relaxation', 'missing_comparative_reference', input);
  if (input.conflicts.length) return capped ? decision('recommend', null, 'sufficient_information', input) : decision('clarify', 'conflict', 'conflicting_constraints', input);
  if (input.candidateCount === 0) return decision('no_result_refinement', 'relaxation', 'no_candidate', input);
  if (!input.intent.category && !input.askedFields.includes('category') && !capped) return decision('clarify', 'category', input.intent.confidence < 0.65 ? 'low_confidence' : 'missing_category', input);
  const hasBudget = input.intent.budget.min !== null || input.intent.budget.max !== null;
  if (input.intent.category && !hasBudget && input.candidateCount !== null && input.candidateCount > BROAD && !input.askedFields.includes('budget') && !capped) return decision('clarify', 'budget', 'candidate_set_too_broad', input);
  return decision('recommend', null, 'sufficient_information', input);
};
export const AI_CLARIFICATION_BROAD_CANDIDATE_THRESHOLD = BROAD;
