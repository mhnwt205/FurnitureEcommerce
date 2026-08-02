import assert from 'node:assert/strict';
import test from 'node:test';
import { AiConversationSessionStore } from '../services/ai-advisor/conversation/session.store.js';
import { mergeConversationIntent } from '../services/ai-advisor/conversation/merge.service.js';
import { createEmptyIntent, AI_SESSION_TTL_MS, AI_SESSION_MAX_TURNS } from '../services/ai-advisor/conversation/conversation.types.js';
import { processAiConversation } from '../services/ai-advisor/conversation/conversation.service.js';

const intent = (overrides = {}) => ({ ...createEmptyIntent(), intentType: 'product_recommendation', confidence: 0.8, ...overrides });
const resolution = (nextIntent) => ({ intent: nextIntent, source: 'gemini', fallbackBudget: { minPrice: null, maxPrice: null, targetPrice: null, intent: null }, fallbackCategorySlug: null, fallbackAttributes: { colors: [], materials: [], rooms: [], styles: [], sizes: [], dimensions: { widthCm: null, heightCm: null, depthCm: null } } });
const engine = async ({ resolvedIntent }) => ({ answer: 'ok', recommendations: [{ id: 7, finalPrice: 12_000_000, category: resolvedIntent.intent.category, color: 'kem' }] });

test('merge retains missing scalars, overwrites explicit scalar/budget, and replaces/dedupes arrays', () => {
  const first = intent({ category: 'sofa', room: 'living_room', colors: ['cream'], budget: { min: null, max: 20_000_000, currency: 'VND' } });
  const second = intent({ category: null, room: 'bedroom', colors: ['blue', 'blue'], budget: { min: null, max: 15_000_000, currency: 'VND' } });
  const merged = mergeConversationIntent({ previous: first, incoming: second, source: 'gemini_nlu', turnCount: 2 });
  assert.equal(merged.intent.category, 'sofa');
  assert.equal(merged.intent.room, 'bedroom');
  assert.deepEqual(merged.intent.colors, ['blue']);
  assert.equal(merged.intent.budget.max, 15_000_000);
});

test('field metadata prevents a lower-priority derived value from overwriting a user-derived value', () => {
  const merged = mergeConversationIntent({
    previous: intent({ category: 'sofa' }),
    previousFieldMeta: { category: { source: 'gemini_nlu', confidence: 0.8, updatedAtTurn: 1 } },
    incoming: intent({ category: 'bed' }),
    source: 'derived_context',
    turnCount: 2
  });
  assert.equal(merged.intent.category, 'sofa');
  assert.deepEqual(merged.fieldMeta, {});
});

test('conversation creates, reuses, caches idempotent responses, and records minimal recommendation context', async () => {
  const store = new AiConversationSessionStore();
  let engineCalls = 0;
  const resolveIntentFn = async ({ message }) => resolution(intent({ category: message.includes('sofa') ? 'sofa' : null, budget: message.includes('15') ? { min: null, max: 15_000_000, currency: 'VND' } : createEmptyIntent().budget }));
  const advisorResponseFn = async (input) => { engineCalls += 1; return engine(input); };
  const first = await processAiConversation({ message: 'Tôi cần sofa', clientMessageId: 'one', store, resolveIntentFn, advisorResponseFn });
  const second = await processAiConversation({ message: 'dưới 15 triệu', sessionId: first.sessionId, clientMessageId: 'two', store, resolveIntentFn, advisorResponseFn });
  const replay = await processAiConversation({ message: 'dưới 15 triệu', sessionId: first.sessionId, clientMessageId: 'two', store, resolveIntentFn, advisorResponseFn });
  assert.equal(second.sessionId, first.sessionId);
  assert.equal(second.session.turnCount, 2);
  assert.deepEqual(replay, second);
  assert.equal(engineCalls, 2);
  const session = store.get(first.sessionId);
  assert.equal(session.intent.category, 'sofa');
  assert.equal(session.intent.budget.max, 15_000_000);
  assert.deepEqual(session.lastRecommendationContext.productIds, [7]);
});

test('expired, reset, ownership-mismatched, and turn-limit sessions rotate to a new opaque id', async () => {
  let now = new Date('2026-01-01T00:00:00Z');
  const store = new AiConversationSessionStore({ now: () => now });
  const resolveIntentFn = async () => resolution(intent({ category: 'sofa' }));
  const first = await processAiConversation({ message: 'sofa', ownerUserId: 1, store, resolveIntentFn, advisorResponseFn: engine });
  const foreign = await processAiConversation({ message: 'sofa', sessionId: first.sessionId, ownerUserId: 2, store, resolveIntentFn, advisorResponseFn: engine });
  assert.notEqual(foreign.sessionId, first.sessionId);
  const reset = await processAiConversation({ message: 'sofa', sessionId: foreign.sessionId, ownerUserId: 2, resetSession: true, store, resolveIntentFn, advisorResponseFn: engine });
  assert.notEqual(reset.sessionId, foreign.sessionId);
  now = new Date(now.getTime() + AI_SESSION_TTL_MS + 1);
  const expired = await processAiConversation({ message: 'sofa', sessionId: reset.sessionId, ownerUserId: 2, store, resolveIntentFn, advisorResponseFn: engine });
  assert.notEqual(expired.sessionId, reset.sessionId);
  store.get(expired.sessionId).turnCount = AI_SESSION_MAX_TURNS;
  const rotated = await processAiConversation({ message: 'sofa', sessionId: expired.sessionId, ownerUserId: 2, store, resolveIntentFn, advisorResponseFn: engine });
  assert.notEqual(rotated.sessionId, expired.sessionId);
});

test('a session retains turns 1 through 30 and rotates cleanly on turn 31', async () => {
  assert.equal(AI_SESSION_MAX_TURNS, 30);
  const store = new AiConversationSessionStore();
  const resolveIntentFn = async () => resolution(intent({ category: 'sofa' }));
  const first = await processAiConversation({ message: 'sofa', clientMessageId: 'turn-1', store, resolveIntentFn, advisorResponseFn: engine });
  let activeSessionId = first.sessionId;
  for (let turn = 2; turn <= 30; turn += 1) {
    const response = await processAiConversation({ message: `turn ${turn}`, sessionId: activeSessionId, clientMessageId: `turn-${turn}`, store, resolveIntentFn, advisorResponseFn: engine });
    assert.equal(response.sessionId, first.sessionId);
  }
  const previous = store.get(first.sessionId);
  previous.comparativeState.type = 'cheaper';
  previous.clarificationState.consecutiveCount = 2;
  previous.relaxationState.pendingProposal = { proposalId: 'pending' };
  const rotated = await processAiConversation({ message: 'turn 31', sessionId: activeSessionId, clientMessageId: 'turn-31', store, resolveIntentFn, advisorResponseFn: engine });
  assert.notEqual(rotated.sessionId, first.sessionId);
  assert.equal(rotated.session.turnCount, 1);
  const next = store.get(rotated.sessionId);
  assert.equal(next.comparativeState.type, 'none');
  assert.equal(next.clarificationState.consecutiveCount, 0);
  assert.equal(next.relaxationState.pendingProposal, null);
  store.shutdown();
});

test('same-session concurrent requests serialize without losing turns', async () => {
  const store = new AiConversationSessionStore();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const resolveIntentFn = async () => resolution(intent({ category: 'sofa' }));
  let calls = 0;
  let blockNext = false;
  const advisorResponseFn = async (input) => { calls += 1; if (blockNext && calls === 2) await gate; return engine(input); };
  const first = await processAiConversation({ message: 'sofa', store, resolveIntentFn, advisorResponseFn });
  blockNext = true;
  const a = processAiConversation({ message: 'one', sessionId: first.sessionId, clientMessageId: 'a', store, resolveIntentFn, advisorResponseFn });
  const b = processAiConversation({ message: 'two', sessionId: first.sessionId, clientMessageId: 'b', store, resolveIntentFn, advisorResponseFn });
  release();
  await Promise.all([a, b]);
  assert.equal(store.get(first.sessionId).turnCount, 3);
  assert.equal(store.queues.size, 0);
});

test('session store evicts least-recently-used sessions, sweeps expired entries, and bounds reset receipts', () => {
  let now = new Date('2026-01-01T00:00:00Z');
  const store = new AiConversationSessionStore({ now: () => now, maxSessions: 2, receiptTtlMs: 10, startCleanup: false });
  const first = store.create(); now = new Date(now.getTime() + 1); const second = store.create();
  store.get(second.id); now = new Date(now.getTime() + 1); const third = store.create();
  assert.equal(store.sessions.size, 2); assert.equal(store.get(first.id), null); assert.ok(store.get(second.id)); assert.ok(store.get(third.id));
  store.setResetReceipt(null, first.id, 'x', { answer: 'ok' }); now = new Date(now.getTime() + 11); store.sweep();
  assert.equal(store.resetReceipts.size, 0); store.shutdown();
});

test('explicit clear phrases clear only the requested preference while omitted arrays retain context', () => {
  const previous = intent({ colors: ['cream'], budget: { min: null, max: 15_000_000, currency: 'VND' } });
  const retained = mergeConversationIntent({ previous, incoming: intent(), source: 'gemini_nlu', turnCount: 2, operations: { colors: 'retain', budget: 'retain' } });
  assert.deepEqual(retained.intent.colors, ['cream']);
  const cleared = mergeConversationIntent({ previous, incoming: intent(), source: 'gemini_nlu', turnCount: 2, operations: { colors: 'clear', budget: 'clear' } });
  assert.deepEqual(cleared.intent.colors, []); assert.deepEqual(cleared.intent.budget, { min: null, max: null, currency: 'VND' });
});
