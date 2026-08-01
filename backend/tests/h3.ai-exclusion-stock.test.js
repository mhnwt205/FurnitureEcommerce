import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCandidateEligibility } from '../services/ai-advisor/candidates/eligibility.service.js';
import { prepareAdvisorCandidates } from '../services/ai-advisor/recommendation/advisor.service.js';
import { buildCandidateSummary } from '../services/ai-advisor/candidates/summary.service.js';
import { processAiConversation } from '../services/ai-advisor/conversation/conversation.service.js';
import { AiConversationSessionStore } from '../services/ai-advisor/conversation/session.store.js';
import { createEmptyIntent } from '../services/ai-advisor/conversation/conversation.types.js';

const attributes = { colors: [], materials: [], rooms: [], styles: [], sizes: [], dimensions: { widthCm: null, heightCm: null, depthCm: null } };
const budget = { intent: null, minPrice: null, maxPrice: null };
const product = (id, overrides = {}) => ({
  id,
  price: 10_000_000,
  finalPrice: 10_000_000,
  stock: 2,
  category: { slug: 'sofa' },
  color: 'kem',
  material: 'go',
  style: 'hien dai',
  ...overrides
});

test('eligibility applies exclusion hard filters after positive filters without mutating candidates', () => {
  const candidates = [
    product(1, { color: 'trang' }),
    product(2, { material: 'da' }),
    product(3, { style: 'co dien' }),
    product(4, { category: { slug: 'ban' } }),
    product(5)
  ];
  const before = structuredClone(candidates);

  const result = applyCandidateEligibility({
    candidates,
    budget,
    attributes,
    hasAttributes: false,
    excluded: { categories: ['ban'], colors: ['white'], materials: ['leather'], styles: ['classic'] },
    stockRequired: false
  });

  assert.deepEqual(result.candidates.map((item) => item.id), [5]);
  assert.deepEqual(result.diagnostics, {
    beforeBudgetCount: 5, afterBudgetCount: 5,
    beforeAttributeCount: 5, afterAttributeCount: 5,
    beforeExclusionCount: 5, afterExclusionCount: 1,
    beforeStockCount: 1, afterStockCount: 1,
    exclusionApplied: true, stockRequired: false
  });
  assert.deepEqual(candidates, before);
});

test('eligibility makes stockRequired a hard filter while retaining default stock behavior', () => {
  const candidates = [product(1, { stock: 3 }), product(2, { stock: 0 }), product(3, { stock: -1 }), product(4, { stock: null }), product(5, { stock: '2' }), product(6, { stock: 'not-a-number' })];
  const required = applyCandidateEligibility({ candidates, budget, attributes, hasAttributes: false, excluded: {}, stockRequired: true });
  const optional = applyCandidateEligibility({ candidates, budget, attributes, hasAttributes: false, excluded: {}, stockRequired: false });
  assert.deepEqual(required.candidates.map((item) => item.id), [1, 5]);
  assert.deepEqual(optional.candidates.map((item) => item.id), [1, 2, 3, 4, 5, 6]);
  assert.equal(required.diagnostics.afterStockCount, 2);
  assert.equal(optional.diagnostics.beforeStockCount, 6);
  assert.equal(optional.diagnostics.afterStockCount, 6);
});

test('eligibility reports first terminal hard-filter cause deterministically', () => {
  const excluded = applyCandidateEligibility({ candidates: [product(1, { color: 'trang' })], budget, attributes, hasAttributes: false, excluded: { colors: ['white'] }, stockRequired: true });
  const stock = applyCandidateEligibility({ candidates: [product(2, { stock: 0 })], budget, attributes, hasAttributes: false, excluded: {}, stockRequired: true });
  assert.equal(excluded.diagnostics.afterExclusionCount, 0);
  assert.equal(excluded.diagnostics.afterStockCount, 0);
  assert.equal(stock.diagnostics.afterExclusionCount, 1);
  assert.equal(stock.diagnostics.afterStockCount, 0);
});

test('Stage 1 forwards working exclusions and stockRequired to the eligibility operation once', async () => {
  const calls = [];
  const intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', stockRequired: true };
  const result = await prepareAdvisorCandidates({ message: 'sofa còn hàng', resolvedIntent: { intent, source: 'merged', fallbackBudget: {}, fallbackCategorySlug: null, fallbackAttributes: attributes }, excluded: { colors: ['white'] } }, {
    findCurrentProduct: async () => null,
    retrieveCandidates: async () => ({ candidates: [product(1)], metadata: { primaryCount: 1, retrievedCount: 1, fallbackUsed: false, fallbackReason: 'none' } }),
    enrichCandidatePromotions: async (items) => items,
    applyCandidateEligibility: (input) => { calls.push(input); return applyCandidateEligibility(input); }
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].excluded, { categories: [], colors: ['white'], materials: [], styles: [] });
  assert.equal(calls[0].stockRequired, true);
  assert.deepEqual(result.eligibility.candidates.map((item) => item.id), [1]);
});

test('exclusion and stock no-result summaries short-circuit conversation before recommendation completion', async () => {
  const store = new AiConversationSessionStore({ startCleanup: false });
  const intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', stockRequired: true, confidence: 0.9 };
  const artifacts = {
    intent,
    retrieval: { candidates: [product(1, { stock: 0 })], metadata: { primaryCount: 1, retrievedCount: 1, fallbackUsed: false, fallbackReason: 'none' } },
    enrichment: { candidates: [product(1, { stock: 0 })] },
    eligibility: { candidates: [], diagnostics: { beforeBudgetCount: 1, afterBudgetCount: 1, beforeAttributeCount: 1, afterAttributeCount: 1, beforeExclusionCount: 1, afterExclusionCount: 1, beforeStockCount: 1, afterStockCount: 0, exclusionApplied: false, stockRequired: true } },
    stageContext: {}
  };
  let completeCalls = 0;
  const response = await processAiConversation({
    message: 'sofa còn hàng', store,
    resolveIntentFn: async () => ({ intent, source: 'gemini', fallbackBudget: {}, fallbackCategorySlug: null, fallbackAttributes: attributes }),
    prepareCandidatesFn: async () => artifacts,
    buildSummaryFn: buildCandidateSummary,
    completeRecommendationFn: async () => { completeCalls += 1; throw new Error('must not complete'); }
  });
  assert.equal(response.type, 'relaxation_proposal');
  assert.equal(response.relaxation.reasonCode, 'out_of_stock_only');
  assert.equal(response.relaxation.options.length, 1);
  assert.deepEqual(response.recommendations, []);
  assert.equal(completeCalls, 0);
  store.shutdown();
});

test('fallback candidates remain subject to exclusions and explicit stock can be cleared by phrase', async () => {
  const fallback = applyCandidateEligibility({ candidates: [product(1, { color: 'trang' })], budget, attributes, hasAttributes: false, excluded: { colors: ['white'] }, stockRequired: false });
  assert.deepEqual(fallback.candidates, []);

  const store = new AiConversationSessionStore({ startCleanup: false });
  const session = store.create();
  session.intent = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', stockRequired: true, confidence: 0.8 };
  const incoming = { ...createEmptyIntent(), intentType: 'product_recommendation', category: 'sofa', stockRequired: false, confidence: 0.8 };
  const response = await processAiConversation({
    message: 'không cần còn hàng', sessionId: session.id, store,
    resolveIntentFn: async () => ({ intent: incoming, source: 'gemini', fallbackBudget: {}, fallbackCategorySlug: null, fallbackAttributes: attributes }),
    advisorResponseFn: async () => ({ answer: 'ok', recommendations: [] })
  });
  assert.equal(store.get(response.sessionId).intent.stockRequired, false);
  store.shutdown();
});
