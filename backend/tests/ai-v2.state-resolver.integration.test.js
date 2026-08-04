import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../prismaClient.js';
import { processAiChat } from '../services/ai/aiChat.service.js';
import { createInMemoryAiConversationStore } from '../services/ai/aiConversation.service.js';
import { assertTestDatabaseEnvironment } from './testDatabaseEnvironment.js';

const prefix = `AI_V22_E2E_${Date.now()}_`;
const productIds = [];
let categoryId;
const config = Object.freeze({ apiKey: 'mock-key', model: 'mock-model', maxCandidates: 10, providerTimeoutMs: 7_000, providerMaxAttempts: 1, stateResolverTimeoutMs: 3_000, stateResolverMaxAttempts: 1, requestTotalTimeoutMs: 12_000 });
const profile = () => ({ productType: null, room: null, budgetMin: null, budgetMax: null, household: [], style: null, materials: [], colors: [] });

const transitionFor = (message, stored) => {
  if (message === 'tìm sofa') return { operation: 'refine', clear: [], set: { productType: 'sofa' } };
  if (message === 'dưới 5 triệu') return { operation: 'refine', clear: [], set: { budgetMax: 5_000_000 } };
  if (message === 'trên 5 triệu') return { operation: 'refine', clear: ['budgetMax'], set: { budgetMin: 5_000_000 } };
  if (message.includes('không tìm sofa')) return { operation: 'replace', clear: ['budgetMax'], set: { productType: 'bed', room: 'bedroom', budgetMin: 5_000_000 } };
  if (message.includes('giữ ngân sách')) return { operation: 'replace', clear: [], set: { productType: 'bed', budgetMax: 10_000_000 } };
  if (message.includes('bỏ tất cả')) return { operation: 'reset', clear: [], set: {} };
  if (message === 'sofa dưới 5') return { operation: 'refine', clear: [], set: { productType: 'sofa', budgetMax: 5_000_000 } };
  if (message === 'giường trên 5') return { operation: 'replace', clear: ['budgetMax'], set: { productType: 'bed', budgetMin: 5_000_000 } };
  return { operation: 'refine', clear: [], set: {} };
};

const makeServices = ({ resolver = async ({ message, profile: stored }) => ({ ok: true, transition: transitionFor(message, stored), provider: { attemptCount: 1 } }), advisor = async ({ allowedCandidateIds }) => ({ ok: true, data: { answer: 'Mock advisor', recommendations: allowedCandidateIds.slice(0, 1).map((id) => ({ id, reason: 'Mock reason' })) }, provider: { attemptCount: 1 } }) } = {}) => ({
  getAiConfig: () => config,
  resolveAiConversationState: resolver,
  callAiProvider: advisor
});
const send = (message, services, store, conversationId) => processAiChat({ message }, { ...services, conversationStore: store, conversationId });

test.before(async () => {
  assertTestDatabaseEnvironment();
  const category = await prisma.category.create({ data: { name: `${prefix}Sofa Giường`, slug: `${prefix.toLowerCase()}catalog` } });
  categoryId = category.id;
  for (const [name, price, stock] of [['Sofa dưới 5 triệu', 4_000_000, 8], ['Sofa trên 5 triệu', 6_000_000, 8], ['Giường trên 5 triệu', 7_000_000, 8], ['Giường <= 10 triệu', 9_000_000, 8]]) {
    const product = await prisma.product.create({ data: { categoryId, name: `${prefix}${name}`, slug: `${prefix.toLowerCase()}${productIds.length}`, price, stock, isActive: true, roomType: 'bedroom' } });
    productIds.push(product.id);
  }
});

test.after(async () => {
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
});

test('A-D: budget direction, replacement, preserved constraint, and reset persist the validated profile through real retrieval', async () => {
  const store = createInMemoryAiConversationStore({ ttlMs: 60_000, maxEntries: 20, maxRecentTurns: 6, maxTotalChars: 1_800, maxTurnChars: 600 });
  const services = makeServices();
  let result = await send('tìm sofa', services, store);
  const id = result.internal.conversationId;
  await send('dưới 5 triệu', services, store, id);
  result = await send('trên 5 triệu', services, store, id);
  assert.deepEqual(store.get(id).profile, { ...profile(), productType: 'sofa', budgetMin: 5_000_000 });
  assert.ok(result.response.recommendations.every((item) => item.price >= 5_000_000));

  result = await send('không tìm sofa nữa, tôi muốn giường ngủ trên 5 triệu', services, store, id);
  assert.deepEqual(store.get(id).profile, { ...profile(), productType: 'bed', room: 'bedroom', budgetMin: 5_000_000 });
  assert.ok(result.response.recommendations.every((item) => item.name.includes('Giường') && item.price >= 5_000_000));

  result = await send('đổi sang giường nhưng vẫn giữ ngân sách dưới 10 triệu', services, store, id);
  assert.equal(store.get(id).profile.productType, 'bed');
  assert.equal(store.get(id).profile.budgetMax, 10_000_000);
  assert.ok(result.response.recommendations.every((item) => item.price <= 10_000_000));

  await send('bỏ tất cả yêu cầu cũ, bắt đầu lại', services, store, id);
  assert.deepEqual(store.get(id).profile, profile());
});

test('E-F: resolver timeout uses safe fallback once; advisor timeout keeps state and public contract safe', async () => {
  let resolverCalls = 0;
  let advisorCalls = 0;
  const store = createInMemoryAiConversationStore({ ttlMs: 60_000, maxEntries: 20, maxRecentTurns: 6, maxTotalChars: 1_800, maxTurnChars: 600 });
  const services = makeServices({
    resolver: async ({ message, profile: stored, config: resolverConfig }) => {
      resolverCalls += 1;
      assert.equal(resolverConfig.stateResolverTimeoutMs, 3_000);
      if (message === 'giường trên 5 triệu') return { ok: false, error: { code: 'AI_PROVIDER_TIMEOUT' }, provider: { attemptCount: 1 } };
      return { ok: true, transition: transitionFor(message, stored), provider: { attemptCount: 1 } };
    },
    advisor: async ({ allowedCandidateIds, config: advisorConfig }) => {
      advisorCalls += 1;
      assert.equal(advisorConfig.timeoutMs, 7_000);
      if (advisorCalls === 2) return { ok: false, error: { code: 'AI_PROVIDER_TIMEOUT' }, provider: { attemptCount: 1 } };
      return { ok: true, data: { answer: 'Mock advisor', recommendations: allowedCandidateIds.slice(0, 1).map((id) => ({ id, reason: 'Mock reason' })) }, provider: { attemptCount: 1 } };
    }
  });
  let result = await send('sofa dưới 5', services, store);
  const id = result.internal.conversationId;
  result = await send('giường trên 5 triệu', services, store, id);
  assert.deepEqual(store.get(id).profile, { ...profile(), productType: 'bed', budgetMin: 5_000_000 });
  assert.equal(result.internal.resolverFallbackUsed, true);
  assert.equal(JSON.stringify(result.response).includes('AI_PROVIDER_TIMEOUT'), false);
  assert.equal(resolverCalls, 2);
  assert.equal(advisorCalls, 2);
  const continued = await send('tìm sofa', services, store, id);
  assert.equal(continued.internal.conversationId, id);
});

test('G-H: conversations isolate state and the same conversation serializes concurrent turns without a contradictory budget', async () => {
  const store = createInMemoryAiConversationStore({ ttlMs: 60_000, maxEntries: 20, maxRecentTurns: 6, maxTotalChars: 1_800, maxTurnChars: 600 });
  const services = makeServices();
  const [a, b] = await Promise.all([send('sofa dưới 5', services, store), send('giường trên 5', services, store)]);
  assert.notEqual(a.internal.conversationId, b.internal.conversationId);
  assert.equal(store.get(a.internal.conversationId).profile.productType, 'sofa');
  assert.equal(store.get(b.internal.conversationId).profile.productType, 'bed');
  await Promise.all([send('dưới 5 triệu', services, store, a.internal.conversationId), send('trên 5 triệu', services, store, a.internal.conversationId)]);
  const state = store.get(a.internal.conversationId);
  assert.equal(state.profile.budgetMin, 5_000_000);
  assert.equal(state.profile.budgetMax, null);
  assert.equal(state.recentUserTurns.filter((turn) => turn === 'dưới 5 triệu').length, 1);
  assert.equal(state.recentUserTurns.filter((turn) => turn === 'trên 5 triệu').length, 1);
});
