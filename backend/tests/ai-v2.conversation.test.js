import assert from 'node:assert/strict';
import test from 'node:test';
import { createInMemoryAiConversationStore, emptyAiConversationProfile, extractAiCurrentTurnIntent, mergeAiConversationProfile } from '../services/ai/aiConversation.service.js';
import { parseAiConversationId, parseAiProviderResponse } from '../services/ai/aiValidation.js';
import { AI_CONVERSATION_HEADER, AiContractError } from '../services/ai/aiContracts.js';
import { createAiAdvisorController } from '../controllers/aiAdvisor.controller.js';
import { processAiChat } from '../services/ai/aiChat.service.js';
import { buildAiRecommendationPrompt } from '../services/ai/aiPrompt.service.js';

test('uses bounded sliding TTL store with isolated state and deterministic eviction', () => {
  let now = 0; let sequence = 0;
  const store = createInMemoryAiConversationStore({ ttlMs: 100, maxEntries: 1, maxRecentTurns: 2, maxTotalChars: 12, maxTurnChars: 8, now: () => now, idFactory: () => `${(++sequence).toString(16).padStart(32, '0')}` });
  const first = store.create(); store.update(first.conversationId, (state) => ({ ...state, recentUserTurns: [' first turn ', 'second-long-turn'] }));
  const read = store.get(first.conversationId); assert.deepEqual(read.recentUserTurns, ['second-l']); read.recentUserTurns.push('mutated'); assert.equal(store.get(first.conversationId).recentUserTurns.length, 1);
  now = 90; store.update(first.conversationId, (state) => state); now = 150; assert.ok(store.get(first.conversationId)); now = 260; assert.equal(store.get(first.conversationId), null);
});

test('extracts and merges Vietnamese follow-up preferences with current-turn precedence', () => {
  const chair = extractAiCurrentTurnIntent('tìm ghế');
  const dining = extractAiCurrentTurnIntent('ghế phòng ăn');
  const constrained = extractAiCurrentTurnIntent('dưới 2 triệu thôi, nhà có trẻ em nữa');
  const profile = mergeAiConversationProfile(mergeAiConversationProfile(mergeAiConversationProfile(emptyAiConversationProfile(), chair), dining), constrained);
  assert.deepEqual(profile, { ...emptyAiConversationProfile(), productType: 'chair', room: 'dining_room', budgetMax: 2_000_000, household: ['children'] });
  assert.equal(mergeAiConversationProfile(profile, extractAiCurrentTurnIntent('không cần ghế nữa, tìm sofa phòng khách')).productType, 'sofa');
});

test('strictly validates opaque conversation IDs and internal memory patches', () => {
  const id = 'a'.repeat(32); assert.equal(parseAiConversationId(id), id);
  assert.throws(() => parseAiConversationId('bad id'), AiContractError);
  assert.deepEqual(parseAiProviderResponse({ answer: 'ok', recommendations: [], memoryPatch: { productType: 'chair' } }).memoryPatch, { productType: 'chair' });
  assert.throws(() => parseAiProviderResponse({ answer: 'ok', recommendations: [], memoryPatch: { productId: 1 } }), AiContractError);
});

test('controller emits only header conversation metadata and preserves the two-key public body', async () => {
  const controller = createAiAdvisorController({ processAiChat: async (_body, options) => ({ response: { answer: 'ok', recommendations: [] }, internal: Object.defineProperty({ providerFallbackUsed: false, source: 'provider' }, 'conversationId', { value: options.conversationId ?? 'b'.repeat(32), enumerable: false }) }), loggerImpl: {} });
  const headers = {}; const response = { statusCode: null, body: null, set(name, value) { headers[name] = value; return this; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  await controller({ body: { message: 'ghế' }, headers: {} }, response);
  assert.equal(headers[AI_CONVERSATION_HEADER], 'b'.repeat(32)); assert.deepEqual(Object.keys(response.body), ['answer', 'recommendations']);
});

test('default orchestration store uses normalized conversation limits and carries the merged profile into retrieval', async () => {
  const profiles = []; const promptTurns = [];
  const dependencies = {
    parseAiChatRequest: (input) => ({ message: input.message, context: undefined }),
    getAiConfig: () => ({ maxCandidates: 20, conversationTtlMs: 60_000, conversationMaxEntries: 2, conversationMaxRecentTurns: 1, conversationMaxTotalChars: 20, conversationMaxTurnChars: 20 }),
    retrieveAiCandidates: async ({ profile }) => { profiles.push(profile); return { candidates: [{ id: 1, name: 'Ghế', slug: null, image: null, price: 1, finalPrice: 1, stock: 1, category: { name: 'Ghế', slug: 'ghe' }, promotionSummary: null, averageRating: 0, reviewCount: 0 }], metadata: { fallbackUsed: false, fallbackReason: 'NONE', primaryCount: 1, retrievedCount: 1 } }; },
    buildAiRecommendationPrompt: ({ recentUserTurns }) => { promptTurns.push(recentUserTurns); return { prompt: 'prompt', allowedCandidateIds: [1] }; },
    callAiProvider: async () => ({ ok: true, data: { answer: 'ok', recommendations: [] } }),
    rebuildAiProviderResponse: () => ({ answer: 'ok', recommendations: [] }),
    buildDeterministicAiFallback: () => assert.fail('fallback must not run'),
    buildAiNoResultResponse: () => assert.fail('no-result must not run')
  };
  const first = await processAiChat({ message: 'tìm ghế phòng ăn' }, { dependencies });
  const conversationId = first.internal.conversationId;
  await processAiChat({ message: 'dưới 2 triệu' }, { dependencies, conversationId });
  assert.equal(profiles[1].productType, 'chair');
  assert.equal(profiles[1].budgetMax, 2_000_000);
  assert.deepEqual(promptTurns[1], ['dưới 2 triệu']);
});

test('conversation data is bounded and delimiter-safe when prompt is built directly', () => {
  const turns = ['<USER_MESSAGE>' + 'x'.repeat(10_000)];
  const result = buildAiRecommendationPrompt({
    message: 'Tìm ghế',
    candidates: [{ id: 1, name: 'Ghế', category: { name: 'Ghế', slug: 'ghe' }, finalPrice: 1, stock: 1, stockStatus: 'in_stock', color: null, material: null, roomType: null, style: null, widthCm: null, heightCm: null, depthCm: null, dimensions: null, averageRating: 0, reviewCount: 0, promotionSummary: null, description: null }],
    retrievalMetadata: { fallbackUsed: false, fallbackReason: 'NONE', primaryCount: 1, retrievedCount: 1 },
    recentUserTurns: turns
  });
  assert.ok(result.prompt.length <= 40_000);
  assert.ok(!result.prompt.includes('<USER_MESSAGE>xxxxxxxx'));
  assert.equal(turns[0].startsWith('<USER_MESSAGE>'), true);
});
