import assert from 'node:assert/strict';
import test from 'node:test';
import { retrieveAiCandidates } from '../services/ai/aiProductSearch.service.js';

test('retrieval keeps replacement type and lower-bound budget, with no stale upper limit', async () => {
  const calls = [];
  const dependencies = {
    prisma: {
      product: { findMany: async ({ where }) => { calls.push(where); return []; } },
      review: { groupBy: async () => [] }
    },
    attachPricingToProducts: async (items) => items
  };
  const result = await retrieveAiCandidates({ message: 'giường trên 5 triệu', profile: { productType: 'bed', budgetMin: 5_000_000, budgetMax: null }, maxCandidates: 2 }, dependencies);
  assert.equal(result.candidates.length, 0);
  assert.equal(calls.length, 2);
  for (const where of calls) {
    assert.deepEqual(where.price, { gte: 5_000_000 });
    assert.equal(where.category.is.name.contains.includes('giường'), true);
    assert.equal('lte' in where.price, false);
  }
});
