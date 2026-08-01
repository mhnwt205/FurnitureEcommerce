import assert from 'node:assert/strict';
import test from 'node:test';
import { AiConversationSessionStore } from '../services/ai-advisor/conversation/session.store.js';
import { createEmptyIntent } from '../services/ai-advisor/conversation/conversation.types.js';
import { processAiConversation } from '../services/ai-advisor/conversation/conversation.service.js';
import { createAiTelemetry } from '../services/ai-advisor/telemetry/telemetry.service.js';
import { callGeminiIntent } from '../services/ai-advisor/intent/intent-extraction.service.js';

const resolved = (intent) => ({ intent, source: 'fallback', fallbackBudget: { minPrice: null, maxPrice: null, targetPrice: null, intent: null }, fallbackCategorySlug: null, fallbackAttributes: { colors: [], materials: [], rooms: [], styles: [], sizes: [], dimensions: { widthCm: null, heightCm: null, depthCm: null } } });
const prepared = (intent, candidates = []) => ({ intent, retrieval: { candidates: [], metadata: { primaryCount: 1, retrievedCount: candidates.length, fallbackUsed: false, fallbackReason: 'none' } }, enrichment: { candidates }, eligibility: { candidates, diagnostics: { beforeBudgetCount: candidates.length, afterBudgetCount: candidates.length, beforeAttributeCount: candidates.length, afterAttributeCount: candidates.length } }, stageContext: {} });
const policy = (action) => ({ decision: { action, field: action === 'clarify' ? 'category' : action === 'no_result_refinement' ? 'relaxation' : null, reasonCode: action === 'clarify' ? 'missing_category' : action === 'no_result_refinement' ? 'no_candidate' : 'sufficient_information' }, nextClarificationState: { consecutiveCount: action === 'clarify' ? 1 : 0, lastAskedField: action === 'clarify' ? 'category' : null, askedFields: action === 'clarify' ? ['category'] : [], lastReasonCode: action === 'clarify' ? 'missing_category' : null } });
const eventNames = (events) => events.map((event) => event.eventName);

test('recommendation lifecycle emits bounded events once and records Stage 2 completion', async () => {
  const events = []; const telemetry = createAiTelemetry({ eventSink: (event) => events.push(event) }); const store = new AiConversationSessionStore({ startCleanup: false });
  const intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', confidence: .8 };
  const response = await processAiConversation({ message: 'sofa', clientMessageId: 't-1', telemetry, store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => prepared(intent, [{ id: 1 }]), buildSummaryFn: () => ({ eligibleCount: 1, noResultReasons: [] }), orchestrateClarificationFn: () => policy('recommend'), completeRecommendationFn: async () => ({ answer: 'ok', recommendations: [{ id: 1, finalPrice: 1, category: 'Sofa' }] }) });
  assert.equal(response.type, 'recommendation');
  assert.deepEqual(eventNames(events).filter((name) => ['ai_request_started', 'ai_candidate_pipeline_completed', 'ai_recommendation_returned', 'ai_request_completed'].includes(name)), ['ai_request_started', 'ai_candidate_pipeline_completed', 'ai_recommendation_returned', 'ai_request_completed']);
  assert.equal(events.find((event) => event.eventName === 'ai_recommendation_returned').metadata.recommendationCount, 1);
  store.shutdown();
});

test('clarification and relaxation proposal paths have no recommendation completion event', async () => {
  const events = []; const telemetry = createAiTelemetry({ eventSink: (event) => events.push(event) }); const store = new AiConversationSessionStore({ startCleanup: false }); const intent = { ...createEmptyIntent(), confidence: .8 };
  const clarification = await processAiConversation({ message: 'help', telemetry, store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => prepared(intent), buildSummaryFn: () => ({ eligibleCount: 0, noResultReasons: [] }), orchestrateClarificationFn: () => policy('clarify'), buildQuestionFn: () => ({ text: 'Loại nào?', options: [] }), completeRecommendationFn: async () => { throw new Error('must not run'); } });
  assert.equal(clarification.type, 'clarification');
  assert.ok(eventNames(events).includes('ai_clarification_returned'));
  assert.equal(eventNames(events).includes('ai_recommendation_returned'), false);
  events.length = 0;
  const noResultIntent = { ...intent, category: 'sofa', budget: { min: null, max: 5_000_000, currency: 'VND' } };
  const proposed = await processAiConversation({ message: 'sofa', telemetry, store, resolveIntentFn: async () => resolved(noResultIntent), prepareCandidatesFn: async () => prepared(noResultIntent), buildSummaryFn: () => ({ eligibleCount: 0, noResultReasons: ['no_budget_match'] }), orchestrateClarificationFn: () => policy('no_result_refinement'), buildQuestionFn: () => ({ text: 'Điều chỉnh?', options: [] }), completeRecommendationFn: async () => { throw new Error('must not run'); } });
  assert.equal(proposed.type, 'relaxation_proposal');
  assert.ok(eventNames(events).includes('ai_relaxation_proposed'));
  assert.equal(eventNames(events).includes('ai_recommendation_returned'), false);
  store.shutdown();
});

test('idempotency cache and Stage 1 failure emit safe terminal telemetry without double execution', async () => {
  const events = []; const telemetry = createAiTelemetry({ eventSink: (event) => events.push(event) }); const store = new AiConversationSessionStore({ startCleanup: false }); const intent = { ...createEmptyIntent(), confidence: .8 }; let prepares = 0;
  const deps = { telemetry, store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => { prepares += 1; return prepared(intent); }, buildSummaryFn: () => ({ eligibleCount: 0, noResultReasons: [] }), orchestrateClarificationFn: () => policy('clarify'), buildQuestionFn: () => ({ text: 'Loại?', options: [] }) };
  const first = await processAiConversation({ message: 'help', clientMessageId: 'same', ...deps });
  await processAiConversation({ message: 'help', sessionId: first.sessionId, clientMessageId: 'same', ...deps });
  assert.equal(prepares, 1);
  assert.equal(eventNames(events).filter((name) => name === 'ai_request_started').length, 1);
  assert.ok(eventNames(events).includes('ai_idempotency_cache_hit'));
  events.length = 0;
  await assert.rejects(processAiConversation({ message: 'help', telemetry, store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => { throw new Error('retrieval failed'); } }), /retrieval failed/);
  assert.ok(eventNames(events).includes('ai_request_failed'));
  store.shutdown();
});

test('provider no-key fallback is observable without a provider call or secret leakage', async () => {
  const events = []; const telemetry = createAiTelemetry({ eventSink: (event) => events.push(event) }); const prior = process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEY;
  try { assert.equal(await callGeminiIntent({ message: 'customer@example.com token secret', telemetry }), null); } finally { if (prior === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = prior; }
  assert.equal(eventNames(events).includes('ai_provider_fallback'), true);
  assert.equal(JSON.stringify(events).includes('customer@example.com'), false);
});

test('a throwing telemetry sink never changes a successful business response', async () => {
  const telemetry = createAiTelemetry({ eventSink: () => { throw new Error('telemetry unavailable'); }, logger: { warn: () => {} } }); const store = new AiConversationSessionStore({ startCleanup: false }); const intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', confidence: .8 };
  const response = await processAiConversation({ message: 'sofa', telemetry, store, resolveIntentFn: async () => resolved(intent), prepareCandidatesFn: async () => prepared(intent, [{ id: 1 }]), buildSummaryFn: () => ({ eligibleCount: 1, noResultReasons: [] }), orchestrateClarificationFn: () => policy('recommend'), completeRecommendationFn: async () => ({ answer: 'ok', recommendations: [{ id: 1, finalPrice: 1, category: 'Sofa' }] }) });
  assert.equal(response.type, 'recommendation');
  assert.equal(response.recommendations.length, 1);
  store.shutdown();
});

test('session-store eviction reports only bounded lifecycle metadata', () => {
  const events = []; const telemetry = createAiTelemetry({ eventSink: (event) => events.push(event) }); const store = new AiConversationSessionStore({ startCleanup: false, maxSessions: 1, telemetry });
  store.create(); store.create();
  const eviction = events.find((event) => event.eventName === 'ai_session_evicted');
  assert.equal(eviction.metadata.sessionAction, 'capacity');
  assert.equal(Object.hasOwn(eviction.metadata, 'message'), false);
  store.shutdown();
});
