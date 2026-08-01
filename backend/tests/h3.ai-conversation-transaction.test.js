import assert from 'node:assert/strict';
import test from 'node:test';
import { AiConversationSessionStore } from '../services/ai-advisor/conversation/session.store.js';
import { createEmptyIntent } from '../services/ai-advisor/conversation/conversation.types.js';
import { processAiConversation } from '../services/ai-advisor/conversation/conversation.service.js';

const resolution = (intent) => ({ intent, source: 'gemini', fallbackBudget: { minPrice: null, maxPrice: null, targetPrice: null, intent: null }, fallbackCategorySlug: null, fallbackAttributes: { colors: [], materials: [], rooms: [], styles: [], sizes: [], dimensions: { widthCm: null, heightCm: null, depthCm: null } } });

test('a failed Stage 1 rolls back the entire stored session, not only clarification state', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const session = store.create();
  session.intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', budget: { min: null, max: 20_000_000, currency: 'VND' }, colors: ['cream'], confidence: .8 };
  session.fieldMeta = { category: { source: 'gemini_nlu', confidence: .8, updatedAtTurn: 1 } };
  session.excluded.colors = ['white'];
  session.currentProductId = 17;
  session.clarificationState = { consecutiveCount: 1, lastAskedField: 'budget', askedFields: ['budget'], lastReasonCode: 'candidate_set_too_broad', terminal: false, terminalReasonCode: null };
  const before = structuredClone(session);
  const incoming = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'ban', budget: { min: null, max: 10_000_000, currency: 'VND' }, colors: [], confidence: .9 };
  await assert.rejects(processAiConversation({ message: 'Bàn dưới 10 triệu, không cần màu', sessionId: session.id, clientMessageId: 'rollback', context: { currentProductId: 88 }, store, resolveIntentFn: async () => resolution(incoming), prepareCandidatesFn: async () => { throw new Error('stage one failed'); } }), /stage one failed/);
  assert.deepEqual(store.get(session.id), before);
  store.shutdown();
});

test('an invalid final response fails strict validation and rolls back the working session', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const session = store.create();
  const before = structuredClone(session);
  const incoming = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', confidence: .8 };
  const artifacts = { intent: incoming, retrieval: { candidates: [], metadata: { primaryCount: 0, retrievedCount: 0, fallbackUsed: false, fallbackReason: 'none' } }, enrichment: { candidates: [], }, eligibility: { candidates: [], diagnostics: { beforeBudgetCount: 0, afterBudgetCount: 0, beforeAttributeCount: 0, afterAttributeCount: 0 } }, stageContext: {} };
  await assert.rejects(processAiConversation({ message: 'sofa', sessionId: session.id, store, resolveIntentFn: async () => resolution(incoming), prepareCandidatesFn: async () => artifacts, buildSummaryFn: () => ({ eligibleCount: 0, noResultReasons: [] }), orchestrateClarificationFn: () => ({ decision: { action: 'clarify', field: 'category', reasonCode: 'missing_category' }, nextClarificationState: { consecutiveCount: 1, lastAskedField: 'category', askedFields: ['category'], lastReasonCode: 'missing_category', terminal: false, terminalReasonCode: null } }), buildQuestionFn: () => ({ text: '', options: [] }) }));
  assert.deepEqual(store.get(session.id), before);
  store.shutdown();
});

test('failed Stage 1 does not commit an exclusion or stockRequired change from the working session', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const session = store.create();
  session.intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', colors: ['cream'], stockRequired: false, confidence: .8 };
  const before = structuredClone(session);
  const incoming = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', colors: ['blue'], stockRequired: true, confidence: .9 };
  await assert.rejects(processAiConversation({ message: 'không lấy màu xanh, cần còn hàng', sessionId: session.id, store, resolveIntentFn: async () => resolution(incoming), prepareCandidatesFn: async () => { throw new Error('eligibility failed'); } }), /eligibility failed/);
  assert.deepEqual(store.get(session.id), before);
  store.shutdown();
});

test('comparative state is committed only after a successful request and clears for a new explicit category', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const session = store.create();
  session.lastRecommendationContext = { productIds: [11, 22], minPrice: 5_000_000, maxPrice: 9_000_000, category: 'sofa', dominantColors: ['blue'], dominantSize: null };
  const neutral = { ...createEmptyIntent(), intentType: 'product_recommendation', confidence: .9 };
  await processAiConversation({ message: 'rẻ hơn', sessionId: session.id, clientMessageId: 'comparative-success', store, resolveIntentFn: async () => resolution(neutral), advisorResponseFn: async () => ({ answer: 'ok', recommendations: [] }) });
  assert.equal(store.get(session.id).comparativeState.type, 'cheaper');
  assert.equal(store.get(session.id).comparativeState.reference.maxPrice, 9_000_000);

  const category = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'ban', confidence: .9 };
  await processAiConversation({ message: 'bàn', sessionId: session.id, clientMessageId: 'comparative-clear', store, resolveIntentFn: async () => resolution(category), advisorResponseFn: async () => ({ answer: 'ok', recommendations: [] }) });
  assert.equal(store.get(session.id).comparativeState.type, 'none');
  store.shutdown();
});

test('comparative working state rolls back on Stage 1 failure and duplicate receipts resolve once', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const session = store.create();
  session.lastRecommendationContext = { productIds: [11], minPrice: 1_000_000, maxPrice: 2_000_000, category: 'sofa', dominantColors: [], dominantSize: null };
  const before = structuredClone(session);
  const neutral = { ...createEmptyIntent(), intentType: 'product_recommendation', confidence: .9 };
  await assert.rejects(processAiConversation({ message: 'rẻ hơn', sessionId: session.id, clientMessageId: 'comparative-rollback', store, resolveIntentFn: async () => resolution(neutral), prepareCandidatesFn: async () => { throw new Error('comparative stage failure'); } }), /comparative stage failure/);
  assert.deepEqual(store.get(session.id), before);

  let extracted = 0;
  const call = () => processAiConversation({ message: 'rẻ hơn', sessionId: session.id, clientMessageId: 'comparative-duplicate', store, resolveIntentFn: async () => resolution(neutral), extractComparativeFn: (message) => { extracted += 1; return { type: 'cheaper', ordinal: null, ambiguous: false }; }, advisorResponseFn: async () => ({ answer: 'ok', recommendations: [] }) });
  const [first, duplicate] = await Promise.all([call(), call()]);
  assert.deepEqual(first, duplicate);
  assert.equal(extracted, 1);
  assert.equal(store.get(session.id).comparativeState.type, 'cheaper');
  store.shutdown();
});

test('reset creates a clean comparative state', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const session = store.create();
  session.comparativeState.type = 'different_product';
  const neutral = { ...createEmptyIntent(), intentType: 'product_recommendation', confidence: .9 };
  const response = await processAiConversation({ message: 'bắt đầu lại', sessionId: session.id, clientMessageId: 'comparative-reset', resetSession: true, store, resolveIntentFn: async () => resolution(neutral), advisorResponseFn: async () => ({ answer: 'ok', recommendations: [] }) });
  assert.equal(store.get(response.sessionId).comparativeState.type, 'none');
  store.shutdown();
});
