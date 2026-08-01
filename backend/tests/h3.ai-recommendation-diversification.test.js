import assert from 'node:assert/strict';
import test from 'node:test';
import { diversifyRecommendations } from '../services/ai-advisor/recommendation/diversification.service.js';

const candidate = (id, score, overrides = {}) => ({ score, product: { id, finalPrice: 10_000_000, stock: 3, color: 'blue', material: 'wood', style: 'modern', ...overrides } });

test('relevance diversification is unique, bounded, and does not promote a distant score', () => {
  const ranked = [candidate(2, 100), candidate(1, 100), candidate(3, 96, { color: 'cream' }), candidate(4, 70, { color: 'black' }), candidate(2, 99)];
  const original = structuredClone(ranked);
  const first = diversifyRecommendations({ rankedCandidates: ranked, limit: 5, context: { sortPreference: 'relevance' } });
  assert.deepEqual([...new Set(first.selectedCandidates.map((item) => item.id))], first.selectedCandidates.map((item) => item.id));
  assert.equal(first.selectedCandidates.length, 4);
  assert.equal(first.selectedCandidates.some((item) => item.id === 4), true);
  assert.deepEqual(ranked, original);
});

test('explicit price sorting preserves ranked order rather than applying diversity', () => {
  const ranked = [candidate(1, 1, { finalPrice: 1 }), candidate(2, 1, { finalPrice: 2 }), candidate(3, 1, { finalPrice: 3 })];
  const result = diversifyRecommendations({ rankedCandidates: ranked, limit: 5, context: { sortPreference: 'price_asc' } });
  assert.deepEqual(result.selectedCandidates.map((item) => item.id), [1, 2, 3]);
  assert.equal(result.diagnostics.diversityApplied, false);
  assert.equal(result.diagnostics.diversitySkippedReason, 'explicit_sort_preserved');
});

test('explicit price_desc, rating_desc, and newest sorts preserve the authority-ranked subsequence', () => {
  const cases = [
    { mode: 'price_desc', ranked: [candidate(3, 1, { finalPrice: 30 }), candidate(2, 1, { finalPrice: 20 }), candidate(1, 1, { finalPrice: 10 })] },
    { mode: 'rating_desc', ranked: [candidate(2, 1, { averageRating: 5, reviewCount: 2 }), candidate(3, 1, { averageRating: 5, reviewCount: 1 }), candidate(1, 1, { averageRating: 4, reviewCount: 99 })] },
    { mode: 'newest', ranked: [candidate(3, 1, { createdAt: new Date('2026-03-01') }), candidate(2, 1, { createdAt: new Date('2026-02-01') }), candidate(1, 1, { createdAt: new Date('2026-01-01') })] }
  ];
  for (const { mode, ranked } of cases) {
    const result = diversifyRecommendations({ rankedCandidates: ranked, limit: 5, context: { sortPreference: mode } });
    assert.deepEqual(result.selectedCandidates.map((item) => item.id), ranked.map((item) => item.product.id), mode);
    assert.equal(result.diagnostics.diversityApplied, false, mode);
    assert.equal(result.diagnostics.diversitySkippedReason, 'explicit_sort_preserved', mode);
  }
});

test('relevance keeps authority-ranked order when diversity utility is equal and preserves first duplicate', () => {
  const ranked = [candidate(3, 100), candidate(1, 100), candidate(2, 100), candidate(3, 99)];
  const result = diversifyRecommendations({ rankedCandidates: ranked, limit: 5, context: { sortPreference: 'relevance' } });
  assert.deepEqual(result.selectedCandidates.map((item) => item.id), [3, 1, 2]);
  assert.equal(result.diagnostics.skippedDuplicateLikeCount, 1);
});
