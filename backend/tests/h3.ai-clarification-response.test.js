import assert from 'node:assert/strict';
import test from 'node:test';
import { AiConversationSessionStore } from '../services/ai-advisor/conversation/session.store.js';
import { createEmptyIntent } from '../services/ai-advisor/conversation/conversation.types.js';
import { processAiConversation } from '../services/ai-advisor/conversation/conversation.service.js';

const resolved = (intent) => ({
  intent,
  source: 'gemini',
  fallbackBudget: { minPrice: null, maxPrice: null, targetPrice: null, intent: null },
  fallbackCategorySlug: null,
  fallbackAttributes: { colors: [], materials: [], rooms: [], styles: [], sizes: [], dimensions: { widthCm: null, heightCm: null, depthCm: null } }
});

const prepared = (intent) => ({
  intent,
  retrieval: { candidates: [], metadata: { primaryCount: 0, retrievedCount: 0, fallbackUsed: false, fallbackReason: 'none' } },
  enrichment: { candidates: [] },
  eligibility: { candidates: [], diagnostics: { beforeBudgetCount: 0, afterBudgetCount: 0, beforeAttributeCount: 0, afterAttributeCount: 0 } },
  stageContext: {}
});

test('clarification branch short-circuits Stage 2 and returns the additive response contract', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const calls = { prepare: 0, summary: 0, policy: 0, question: 0, complete: 0 };
  const intent = { ...createEmptyIntent(), confidence: 0.8 };

  const response = await processAiConversation({
    message: 'Tư vấn giúp tôi',
    clientMessageId: 'clarify-1',
    store,
    resolveIntentFn: async () => resolved(intent),
    prepareCandidatesFn: async () => { calls.prepare += 1; return prepared(intent); },
    buildSummaryFn: () => { calls.summary += 1; return { eligibleCount: 0, noResultReasons: [] }; },
    orchestrateClarificationFn: () => { calls.policy += 1; return { decision: { action: 'clarify', field: 'category', reasonCode: 'missing_category' }, nextClarificationState: { consecutiveCount: 1, lastAskedField: 'category', askedFields: ['category'], lastReasonCode: 'missing_category' } }; },
    buildQuestionFn: () => { calls.question += 1; return { text: 'Bạn cần loại sản phẩm nào?', options: ['Sofa'] }; },
    completeRecommendationFn: async () => { calls.complete += 1; throw new Error('must not run'); }
  });

  assert.deepEqual(calls, { prepare: 1, summary: 1, policy: 1, question: 1, complete: 0 });
  assert.equal(response.type, 'clarification');
  assert.deepEqual(response.recommendations, []);
  assert.deepEqual(response.question, { field: 'category', text: 'Bạn cần loại sản phẩm nào?', options: ['Sofa'] });
  assert.equal(store.get(response.sessionId).clarificationState.consecutiveCount, 1);
  store.shutdown();
});

test('recommendation branch reuses prepared artifacts and completes exactly once', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const calls = { prepare: 0, summary: 0, policy: 0, complete: 0 };
  const intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', budget: { min: null, max: 15_000_000, currency: 'VND' }, confidence: 0.9 };
  const artifacts = prepared(intent);
  artifacts.eligibility.candidates = [{ id: 1 }];
  const response = await processAiConversation({
    message: 'Sofa dưới 15 triệu', store, resolveIntentFn: async () => resolved(intent),
    prepareCandidatesFn: async () => { calls.prepare += 1; return artifacts; },
    buildSummaryFn: () => { calls.summary += 1; return { eligibleCount: 1, noResultReasons: [] }; },
    orchestrateClarificationFn: () => { calls.policy += 1; return { decision: { action: 'recommend', field: null, reasonCode: 'sufficient_information' }, nextClarificationState: { consecutiveCount: 0, lastAskedField: null, askedFields: [], lastReasonCode: null } }; },
    completeRecommendationFn: async (received) => { calls.complete += 1; assert.equal(received, artifacts); return { answer: 'ok', recommendations: [{ id: 1, finalPrice: 10_000_000, category: 'Sofa' }], mode: 'rule-based' }; }
  });
  assert.deepEqual(calls, { prepare: 1, summary: 1, policy: 1, complete: 1 });
  assert.equal(response.type, 'recommendation');
  assert.equal(response.recommendations.length, 1);
  store.shutdown();
});

test('no-result returns a relaxation proposal without Stage 2 and does not create recommendation context', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const calls = { complete: 0, question: 0 };
  const intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', budget: { min: null, max: 5_000_000, currency: 'VND' }, confidence: 0.9 };
  const response = await processAiConversation({
    message: 'Sofa dưới 5 triệu', store, resolveIntentFn: async () => resolved(intent),
    prepareCandidatesFn: async () => prepared(intent),
    buildSummaryFn: () => ({ eligibleCount: 0, noResultReasons: ['no_budget_match'] }),
    orchestrateClarificationFn: () => ({ decision: { action: 'no_result_refinement', field: 'relaxation', reasonCode: 'no_candidate' }, nextClarificationState: { consecutiveCount: 1, lastAskedField: 'relaxation', askedFields: ['relaxation'], lastReasonCode: 'no_candidate' } }),
    buildQuestionFn: (_field, _reason, reasons) => { calls.question += 1; assert.deepEqual(reasons, ['no_budget_match']); return { text: 'Điều chỉnh ngân sách?', options: ['5–10 triệu'] }; },
    completeRecommendationFn: async () => { calls.complete += 1; throw new Error('must not run'); }
  });
  assert.equal(response.type, 'relaxation_proposal');
  assert.equal(response.relaxation.reasonCode, 'no_budget_match');
  assert.deepEqual(response.recommendations, []);
  assert.deepEqual(calls, { complete: 0, question: 1 });
  assert.deepEqual(store.get(response.sessionId).lastRecommendationContext.productIds, []);
  store.shutdown();
});

test('two-clarification cap forces recommendation when eligible candidates exist and preserves cap for final no-result guidance', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', confidence: 0.8 };
  const existing = store.create();
  existing.clarificationState = { consecutiveCount: 2, lastAskedField: 'budget', askedFields: ['category', 'budget'], lastReasonCode: 'candidate_set_too_broad' };
  const recommendation = await processAiConversation({
    message: 'sofa', sessionId: existing.id, store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => ({ ...prepared(intent), eligibility: { candidates: [{ id: 2 }], diagnostics: { beforeBudgetCount: 1, afterBudgetCount: 1, beforeAttributeCount: 1, afterAttributeCount: 1 } } }),
    buildSummaryFn: () => ({ eligibleCount: 1, noResultReasons: [] }),
    orchestrateClarificationFn: () => ({ decision: { action: 'recommend', field: null, reasonCode: 'sufficient_information' }, nextClarificationState: { consecutiveCount: 0, lastAskedField: null, askedFields: [], lastReasonCode: null } }),
    completeRecommendationFn: async () => ({ answer: 'ok', recommendations: [{ id: 2, finalPrice: 1, category: 'Sofa' }] })
  });
  assert.equal(recommendation.type, 'recommendation');
  assert.equal(store.get(existing.id).clarificationState.consecutiveCount, 0);

  const none = store.create();
  none.clarificationState = { consecutiveCount: 2, lastAskedField: 'budget', askedFields: ['category', 'budget'], lastReasonCode: 'candidate_set_too_broad' };
  const finalGuidance = await processAiConversation({
    message: 'sofa', sessionId: none.id, store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => prepared(intent),
    buildSummaryFn: () => ({ eligibleCount: 0, noResultReasons: ['no_category_match'] }),
    orchestrateClarificationFn: () => ({ decision: { action: 'no_result_refinement', field: 'relaxation', reasonCode: 'no_candidate' }, nextClarificationState: { consecutiveCount: 2, lastAskedField: 'relaxation', askedFields: ['category', 'budget', 'relaxation'], lastReasonCode: 'no_candidate' } }),
    buildQuestionFn: () => ({ text: 'Thử nhóm khác?', options: [] }), completeRecommendationFn: async () => { throw new Error('must not run'); }
  });
  assert.equal(finalGuidance.type, 'no_result');
  assert.equal(finalGuidance.terminal, true);
  assert.equal(store.get(none.id).clarificationState.consecutiveCount, 2);
  store.shutdown();
});

test('cached sequential and concurrent duplicates execute prepare, policy, question, and state transition once', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const intent = { ...createEmptyIntent(), confidence: 0.8 };
  const calls = { prepare: 0, summary: 0, policy: 0, question: 0 };
  const deps = {
    resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => { calls.prepare += 1; return prepared(intent); },
    buildSummaryFn: () => { calls.summary += 1; return { eligibleCount: 0, noResultReasons: [] }; },
    orchestrateClarificationFn: () => { calls.policy += 1; return { decision: { action: 'clarify', field: 'category', reasonCode: 'missing_category' }, nextClarificationState: { consecutiveCount: 1, lastAskedField: 'category', askedFields: ['category'], lastReasonCode: 'missing_category' } }; },
    buildQuestionFn: () => { calls.question += 1; return { text: 'Loại nào?', options: [] }; }, completeRecommendationFn: async () => { throw new Error('must not run'); }
  };
  const first = await processAiConversation({ message: 'tư vấn', clientMessageId: 'duplicate', store, ...deps });
  const replay = await processAiConversation({ message: 'tư vấn', sessionId: first.sessionId, clientMessageId: 'duplicate', store, ...deps });
  assert.deepEqual(replay, first);
  assert.deepEqual(calls, { prepare: 1, summary: 1, policy: 1, question: 1 });
  const concurrent = await Promise.all([
    processAiConversation({ message: 'tư vấn', sessionId: first.sessionId, clientMessageId: 'concurrent', store, ...deps }),
    processAiConversation({ message: 'tư vấn', sessionId: first.sessionId, clientMessageId: 'concurrent', store, ...deps })
  ]);
  assert.deepEqual(concurrent[0], concurrent[1]);
  assert.deepEqual(calls, { prepare: 2, summary: 2, policy: 2, question: 2 });
  assert.equal(store.get(first.sessionId).clarificationState.consecutiveCount, 1);
  store.shutdown();
});

test('policy failure falls back to recommendation when candidates exist and generic no-result when they do not', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', confidence: 0.8 };
  const withCandidates = await processAiConversation({ message: 'sofa', store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => ({ ...prepared(intent), eligibility: { candidates: [{ id: 3 }], diagnostics: { beforeBudgetCount: 1, afterBudgetCount: 1, beforeAttributeCount: 1, afterAttributeCount: 1 } } }), buildSummaryFn: () => { throw new Error('summary unavailable'); }, completeRecommendationFn: async () => ({ answer: 'fallback recommendation', recommendations: [{ id: 3, finalPrice: 1, category: 'Sofa' }] }) });
  assert.equal(withCandidates.type, 'recommendation');
  const withoutCandidates = await processAiConversation({ message: 'sofa', store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => prepared(intent), buildSummaryFn: () => { throw new Error('summary unavailable'); }, buildQuestionFn: () => ({ text: 'Thử tiêu chí khác?', options: [] }), completeRecommendationFn: async () => { throw new Error('must not run'); } });
  assert.equal(withoutCandidates.type, 'clarification');
  assert.equal(withoutCandidates.question.field, 'relaxation');
  store.shutdown();
});

test('production conversation merge applies replace, append, clear, and exclude without accepting unknown taxonomy', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const base = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', colors: ['cream'], materials: ['wood'], confidence: 0.8 };
  const answer = async () => ({ answer: 'ok', recommendations: [] });
  const first = await processAiConversation({ message: 'sofa màu kem', store, resolveIntentFn: async () => resolved(base), advisorResponseFn: answer });
  const appended = await processAiConversation({ message: 'thêm màu xanh', sessionId: first.sessionId, store, resolveIntentFn: async () => resolved({ ...base, colors: ['blue'] }), advisorResponseFn: answer });
  assert.deepEqual(store.get(appended.sessionId).intent.colors.sort(), ['blue', 'cream']);
  await processAiConversation({ message: 'không lấy màu xanh', sessionId: first.sessionId, store, resolveIntentFn: async () => resolved({ ...base, colors: ['blue'] }), advisorResponseFn: answer });
  assert.deepEqual(store.get(first.sessionId).excluded.colors, ['blue']);
  assert.deepEqual(store.get(first.sessionId).intent.colors, ['cream']);
  await processAiConversation({ message: 'không cần màu', sessionId: first.sessionId, store, resolveIntentFn: async () => resolved({ ...base, colors: [] }), advisorResponseFn: answer });
  assert.deepEqual(store.get(first.sessionId).intent.colors, []);
  await processAiConversation({ message: 'màu không-tồn-tại', sessionId: first.sessionId, store, resolveIntentFn: async () => resolved({ ...base, colors: [] }), advisorResponseFn: answer });
  assert.deepEqual(store.get(first.sessionId).intent.colors, []);
  store.shutdown();
});

test('Stage 1 failure and question-builder failure do not commit an invalid clarification state', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const intent = { ...createEmptyIntent(), confidence: 0.8 };
  await assert.rejects(processAiConversation({ message: 'tư vấn', store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => { throw new Error('retrieval failed'); } }), /retrieval failed/);
  const failedSession = [...store.sessions.values()][0];
  assert.equal(failedSession.clarificationState.consecutiveCount, 0);
  const response = await processAiConversation({
    message: 'tư vấn', store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => prepared(intent),
    buildSummaryFn: () => ({ eligibleCount: 0, noResultReasons: [] }),
    orchestrateClarificationFn: () => ({ decision: { action: 'clarify', field: 'category', reasonCode: 'missing_category' }, nextClarificationState: { consecutiveCount: 1, lastAskedField: 'category', askedFields: ['category'], lastReasonCode: 'missing_category' } }),
    buildQuestionFn: () => { throw new Error('writer unavailable'); }
  });
  assert.equal(response.type, 'clarification');
  assert.equal(store.get(response.sessionId).clarificationState.consecutiveCount, 1);
  store.shutdown();
});
