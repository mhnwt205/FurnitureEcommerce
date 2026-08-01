import { aiAdvisorCharacterization } from '../services/ai-advisor/recommendation/advisor.service.js';
import { extractComparativeSignal } from '../services/ai-advisor/comparative/extraction.service.js';

const normalizeExpected = (value) => value === undefined ? null : value;
const equal = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);

export const evaluateIntentCase = (testCase) => {
  const message = testCase.input.message;
  const actual = {
    category: aiAdvisorCharacterization.extractCategorySlug(message),
    budget: aiAdvisorCharacterization.extractBudget(message),
    attributes: aiAdvisorCharacterization.extractAttributeIntent(message),
    comparativeType: extractComparativeSignal(message).type
  };
  const checks = [];
  if ('category' in testCase.expected.intent) checks.push({ metric: 'category_accuracy', pass: actual.category === testCase.expected.intent.category });
  if (testCase.expected.intent.budget === true) checks.push({ metric: 'budget_parsing', pass: Boolean(actual.budget?.intent) });
  if (testCase.expected.comparativeType) checks.push({ metric: 'comparative_type_accuracy', pass: actual.comparativeType === testCase.expected.comparativeType });
  return { actual, checks, unsupported: testCase.expected.action === 'unsupported', equal: (key, value) => equal(normalizeExpected(actual[key]), value) };
};
