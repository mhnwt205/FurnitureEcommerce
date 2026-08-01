import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRecommendationReasons } from '../services/ai-advisor/recommendation/reason.service.js';

test('grounded reasons are fact-backed, prioritized, bounded, and immutable', () => {
  const product = { id: 1, finalPrice: 9_000_000, stock: 2, category: { slug: 'sofa' }, color: 'blue', material: 'wood', style: 'modern', roomType: 'living_room', averageRating: 4.8, reviewCount: 12, hasPromotion: true, promotion: { id: 2 } };
  const before = structuredClone(product);
  const result = buildRecommendationReasons({ candidates: [product], stageContext: { categorySlug: 'sofa', budget: { intent: 'below', maxPrice: 10_000_000 }, attributes: { colors: ['blue'], materials: ['wood'], styles: [], rooms: [], sizes: [], dimensions: {} }, comparativePolicy: { action: 'none' } } });
  assert.deepEqual(result.get(1).reasonCodes, ['category_match', 'budget_match', 'in_stock']);
  assert.equal(result.get(1).facts.effectivePrice, 9_000_000);
  assert.deepEqual(product, before);
});
