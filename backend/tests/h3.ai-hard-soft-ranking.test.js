import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCandidateEligibility } from '../services/ai-advisor/candidates/eligibility.service.js';
import { aiAdvisorCharacterization, prepareAdvisorCandidates } from '../services/ai-advisor/recommendation/advisor.service.js';
import { diversifyRecommendations } from '../services/ai-advisor/recommendation/diversification.service.js';

const attributes = { colors: [], materials: [], rooms: [], styles: [], sizes: [], dimensions: { widthCm: null, heightCm: null, depthCm: null } };
const product = (id, overrides = {}) => ({ id, price: 10_000_000, finalPrice: 10_000_000, stock: 2, category: { slug: 'sofa', name: 'Sofa' }, color: 'xanh', material: 'go', style: 'hien dai', averageRating: 4, reviewCount: 3, createdAt: new Date('2026-01-01'), ...overrides });
const ranked = (items, sortPreference = null) => items.map((item) => ({ product: item, score: 10 })).sort((a, b) => aiAdvisorCharacterization.compareRankedCandidates(a, b, sortPreference)).map((item) => item.product.id);

test('soft preferences score but do not eliminate candidates, while required attributes do', () => {
  const blue = product(1, { color: 'xanh' });
  const cream = product(2, { color: 'kem' });
  const soft = applyCandidateEligibility({ candidates: [blue, cream], budget: { intent: null }, attributes, hasAttributes: false, excluded: {}, stockRequired: false });
  const hard = applyCandidateEligibility({ candidates: [blue, cream], budget: { intent: null }, attributes: { ...attributes, colors: ['xanh'] }, hasAttributes: true, excluded: {}, stockRequired: false, getAttributeMatch: (candidate) => ({ exact: candidate.color === 'xanh' }) });
  assert.deepEqual(soft.candidates.map((item) => item.id), [1, 2]);
  assert.deepEqual(hard.candidates.map((item) => item.id), [1]);
  const context = { normalizedMessage: 'sofa mau xanh go', keywords: [], budget: { intent: null, minPrice: null, maxPrice: null }, categorySlug: 'sofa', currentProduct: null, attributes: { ...attributes, colors: ['xanh'], materials: ['go'] } };
  assert.ok(aiAdvisorCharacterization.scoreProduct({ product: blue, ...context }) > aiAdvisorCharacterization.scoreProduct({ product: cream, ...context }));
});

test('Stage 1 uses persisted constraint strength to filter only required attributes', async () => {
  const blue = product(1, { color: 'xanh' }); const cream = product(2, { color: 'kem' });
  const resolvedIntent = { intent: { intentType: 'product_recommendation', category: 'sofa', budget: { min: null, max: null, currency: 'VND' }, colors: ['blue'], materials: [], room: null, style: null, size: null, stockRequired: false, sortPreference: null, confidence: .8, missingImportantFields: [], ambiguousFields: [], constraints: [] }, source: 'merged', fallbackBudget: {}, fallbackCategorySlug: null, fallbackAttributes: attributes };
  const deps = {
    findCurrentProduct: async () => null,
    retrieveCandidates: async () => ({ candidates: [blue, cream], metadata: { primaryCount: 2, retrievedCount: 2, fallbackUsed: false, fallbackReason: 'none' } }),
    enrichCandidatePromotions: async (items) => items,
    applyCandidateEligibility: (input) => applyCandidateEligibility({ ...input, getAttributeMatch: aiAdvisorCharacterization.getAttributeMatch, budgetMatches: aiAdvisorCharacterization.budgetMatches })
  };
  const soft = await prepareAdvisorCandidates({ message: 'sofa màu xanh', resolvedIntent, fieldMeta: { colors: { strength: 'preferred' } } }, deps);
  const hard = await prepareAdvisorCandidates({ message: 'chỉ lấy sofa màu xanh', resolvedIntent, fieldMeta: { colors: { strength: 'required' } } }, deps);
  assert.deepEqual(soft.eligibility.candidates.map((item) => item.id), [1, 2]);
  assert.deepEqual(hard.eligibility.candidates.map((item) => item.id), [1]);
  assert.equal(soft.eligibility.diagnostics.afterAttributeCount, 2);
  assert.equal(hard.eligibility.diagnostics.afterAttributeCount, 1);
});

test('deterministic comparator ignores input order and ends with product id', () => {
  const one = product(1); const two = product(2);
  assert.deepEqual(ranked([two, one]), [1, 2]);
  assert.deepEqual(ranked([one, two]), [1, 2]);
});

test('deterministic comparator applies stock, effective price, rating, and explicit sort preferences', () => {
  const inStock = product(3, { stock: 2, finalPrice: 100, averageRating: 3 });
  const outStock = product(1, { stock: 0, finalPrice: 50, averageRating: 5 });
  const expensive = product(2, { stock: 2, finalPrice: 200, averageRating: 4 });
  assert.deepEqual(ranked([outStock, expensive, inStock]), [3, 2, 1]);
  assert.deepEqual(ranked([expensive, inStock], 'price_asc'), [3, 2]);
  assert.deepEqual(ranked([expensive, inStock], 'price_desc'), [2, 3]);
  assert.deepEqual(ranked([inStock, expensive, outStock], 'rating_desc'), [1, 2, 3]);
  const promoted = product(4, { price: 500, finalPrice: 75 });
  assert.deepEqual(ranked([inStock, promoted], 'price_asc'), [4, 3]);
});

test('E2 explicit ranking remains identical when raw input order is reversed before Stage 2 diversification', () => {
  const candidates = [
    product(1, { finalPrice: 100, averageRating: 4, reviewCount: 2, createdAt: new Date('2026-01-01') }),
    product(2, { finalPrice: 200, averageRating: 5, reviewCount: 1, createdAt: new Date('2026-02-01') }),
    product(3, { finalPrice: 300, averageRating: 5, reviewCount: 3, createdAt: new Date('2026-03-01') })
  ];
  for (const sortPreference of ['price_asc', 'price_desc', 'rating_desc', 'newest']) {
    const select = (raw) => diversifyRecommendations({
      rankedCandidates: raw.map((item) => ({ product: item, score: 10 })).sort((left, right) => aiAdvisorCharacterization.compareRankedCandidates(left, right, sortPreference)),
      limit: 5,
      context: { sortPreference }
    }).selectedCandidates.map((item) => item.id);
    assert.deepEqual(select(candidates), select([...candidates].reverse()), sortPreference);
    assert.deepEqual(select(candidates), ranked(candidates, sortPreference), sortPreference);
  }
});
