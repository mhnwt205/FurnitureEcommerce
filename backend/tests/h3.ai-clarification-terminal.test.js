import assert from 'node:assert/strict';
import test from 'node:test';
import { AiConversationSessionStore } from '../services/ai-advisor/conversation/session.store.js';
import { createEmptyIntent } from '../services/ai-advisor/conversation/conversation.types.js';
import { processAiConversation } from '../services/ai-advisor/conversation/conversation.service.js';

const intent = (overrides = {}) => ({ ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', confidence: .8, ...overrides });
const resolved = (value) => ({ intent: value, source: 'gemini', fallbackBudget: { minPrice: null, maxPrice: null, targetPrice: null, intent: null }, fallbackCategorySlug: null, fallbackAttributes: { colors: [], materials: [], rooms: [], styles: [], sizes: [], dimensions: { widthCm: null, heightCm: null, depthCm: null } } });
const prepared = (value) => ({ intent: value, retrieval: { candidates: [], metadata: { primaryCount: 0, retrievedCount: 0, fallbackUsed: false, fallbackReason: 'none' } }, enrichment: { candidates: [] }, eligibility: { candidates: [], diagnostics: { beforeBudgetCount: 0, afterBudgetCount: 0, beforeAttributeCount: 0, afterAttributeCount: 0 } }, stageContext: {} });

test('no-result at the clarification cap becomes terminal and never calls the question builder again', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const session = store.create();
  session.clarificationState = { consecutiveCount: 2, lastAskedField: 'budget', askedFields: ['category', 'budget'], lastReasonCode: 'candidate_set_too_broad', terminal: false, terminalReasonCode: null };
  let questions = 0;
  const deps = { store, resolveIntentFn: async () => resolved(intent()), prepareCandidatesFn: async () => prepared(intent()), buildSummaryFn: () => ({ eligibleCount: 0, noResultReasons: ['no_budget_match'] }), orchestrateClarificationFn: () => ({ decision: { action: 'no_result_refinement', field: 'relaxation', reasonCode: 'no_candidate' }, nextClarificationState: { consecutiveCount: 2, lastAskedField: 'relaxation', askedFields: ['category', 'budget', 'relaxation'], lastReasonCode: 'no_candidate' } }), buildQuestionFn: () => { questions += 1; return { text: 'must not be used', options: [] }; } };
  const first = await processAiConversation({ message: 'Sofa dưới 1 triệu', sessionId: session.id, ...deps });
  assert.equal(first.type, 'no_result'); assert.equal(first.terminal, true); assert.equal(first.question, undefined); assert.equal(questions, 0);
  const second = await processAiConversation({ message: 'Sofa dưới 1 triệu', sessionId: session.id, ...deps });
  assert.equal(second.type, 'no_result'); assert.equal(second.question, undefined); assert.equal(questions, 0);
  assert.equal(store.get(session.id).clarificationState.consecutiveCount, 2); assert.equal(store.get(session.id).clarificationState.terminal, true);
  store.shutdown();
});

test('a meaningful intent change clears terminal state and allows policy clarification again', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const session = store.create();
  session.intent = intent({ budget: { min: null, max: 1_000_000, currency: 'VND' } });
  session.clarificationState = { consecutiveCount: 2, lastAskedField: 'budget', askedFields: ['category', 'budget'], lastReasonCode: 'no_candidate', terminal: true, terminalReasonCode: 'no_candidate' };
  let policyState; let questions = 0;
  const changed = intent({ budget: { min: null, max: 10_000_000, currency: 'VND' } });
  const response = await processAiConversation({
    message: 'Sofa dưới 10 triệu', sessionId: session.id, store, resolveIntentFn: async () => resolved(changed), prepareCandidatesFn: async () => prepared(changed),
    buildSummaryFn: () => ({ eligibleCount: 8, noResultReasons: [] }),
    orchestrateClarificationFn: ({ clarificationState }) => { policyState = clarificationState; return { decision: { action: 'clarify', field: 'budget', reasonCode: 'candidate_set_too_broad' }, nextClarificationState: { consecutiveCount: 1, lastAskedField: 'budget', askedFields: ['budget'], lastReasonCode: 'candidate_set_too_broad', terminal: false, terminalReasonCode: null } }; },
    buildQuestionFn: () => { questions += 1; return { text: 'Ngân sách?', options: [] }; }
  });
  assert.equal(policyState.terminal, false); assert.equal(response.type, 'clarification'); assert.equal(questions, 1); assert.equal(store.get(session.id).clarificationState.terminal, false);
  store.shutdown();
});
