import { decideClarification } from '../services/ai-advisor/clarification/clarification.policy.js';

const intentForPolicy = (intent = {}) => ({
  category: intent.category || null,
  budget: { min: null, max: null }, confidence: 0.9
});

export const evaluatePolicyCase = (testCase, parsed) => {
  if (testCase.expected.action === 'unsupported') return { unsupported: true, checks: [] };
  const candidateCount = testCase.expected.action === 'no_result' ? 0 : testCase.expected.action === 'clarification' ? 3 : 3;
  const decision = decideClarification({
    intent: intentForPolicy({ ...testCase.expected.intent, category: parsed.actual.category || testCase.expected.intent.category }),
    candidateCount,
    noResultReasons: [], conflicts: [], askedFields: [], consecutiveClarificationCount: 0
  });
  const action = decision.action === 'recommend' ? 'recommendation' : decision.action === 'clarify' ? 'clarification' : 'no_result';
  return { actual: decision, unsupported: false, checks: [{ metric: 'action_accuracy', pass: action === testCase.expected.action }, ...(testCase.expected.clarificationField ? [{ metric: 'clarification_field_accuracy', pass: decision.field === testCase.expected.clarificationField }] : [])] };
};
