import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSafeAiResolverFallback } from '../services/ai/aiConversation.service.js';

test('resolver timeout fallback lets explicit bed and lower budget replace stale sofa under-five-million constraints', () => {
  const result = buildSafeAiResolverFallback({ productType: 'sofa', room: null, budgetMin: null, budgetMax: 5_000_000, household: [], style: null, materials: [], colors: [] }, 'giường trên 5 triệu');
  assert.deepEqual(result, { safe: true, staleBudgetCleared: true, profile: { productType: 'bed', room: null, budgetMin: 5_000_000, budgetMax: null, household: [], style: null, materials: [], colors: [] } });
});

test('explicit product, room, and upper budget values win for deterministic supported fields', () => {
  const changed = buildSafeAiResolverFallback({ productType: 'chair', room: 'living_room', budgetMin: 6_000_000, budgetMax: null, household: [], style: null, materials: [], colors: [] }, 'sofa phòng ngủ dưới 5 triệu');
  assert.equal(changed.profile.productType, 'sofa');
  assert.equal(changed.profile.room, 'bedroom');
  assert.equal(changed.profile.budgetMin, null);
  assert.equal(changed.profile.budgetMax, 5_000_000);
  assert.equal(changed.staleBudgetCleared, true);
});

test('ambiguous resolver failure does not silently reuse a stored profile', () => {
  assert.deepEqual(buildSafeAiResolverFallback({ productType: 'sofa' }, 'tìm loại phù hợp'), { safe: false, profile: null, staleBudgetCleared: false });
});
