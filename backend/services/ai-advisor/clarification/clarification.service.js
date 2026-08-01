import { decideClarification } from './clarification.policy.js';
import { recordClarification, resetClarificationState } from '../conversation/merge.service.js';
export const orchestrateClarificationState = ({ mergedIntent, clarificationState, candidateCount = null, conflicts = [], noResultReasons = [] }) => {
  let decision = decideClarification({ intent: mergedIntent, candidateCount, consecutiveClarificationCount: clarificationState.consecutiveCount, askedFields: clarificationState.askedFields, conflicts, noResultReasons });
  if (clarificationState.consecutiveCount >= 2 && decision.action === 'clarify') decision = { ...decision, action: 'recommend', field: null, question: null, reasonCode: 'sufficient_information' };
  const nextClarificationState = ['clarify', 'no_result_refinement'].includes(decision.action)
    ? recordClarification(clarificationState, { field: decision.field, reasonCode: decision.reasonCode })
    : resetClarificationState();
  return { decision, nextClarificationState };
};
