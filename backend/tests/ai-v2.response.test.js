import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDeterministicAiFallback, rebuildAiProviderResponse } from '../services/ai/aiResponse.service.js';

const candidate = (id, overrides = {}) => ({
  id,
  name: `Product ${id}`,
  slug: `product-${id}`,
  image: `https://cdn.example/${id}.jpg`,
  price: 1000000,
  finalPrice: 900000,
  promotionSummary: { name: 'Sale', discountType: 'percentage', discountValue: 10 },
  stock: 3,
  category: { name: 'Sofa', slug: 'sofa' },
  averageRating: 4.8,
  reviewCount: 12,
  ...overrides
});

test('rebuilds public DTOs only from backend candidates and preserves provider order/reasons', () => {
  const candidates = [candidate(2), candidate(7)];
  const providerResult = {
    answer: 'Gợi ý cho bạn',
    recommendations: [{ id: 7, reason: 'Lý do từ AI', price: 1, image: 'provider-forgery', slug: 'provider-forgery', stock: 0 }, { id: 2, reason: 'Lý do thứ hai' }]
  };
  const result = rebuildAiProviderResponse({ providerResult, candidates });
  assert.deepEqual(Object.keys(result), ['answer', 'recommendations']);
  assert.deepEqual(result.recommendations.map(({ id, reason }) => ({ id, reason })), providerResult.recommendations.map(({ id, reason }) => ({ id, reason })));
  assert.deepEqual(result.recommendations[0], {
    id: 7, name: 'Product 7', slug: 'product-7', image: 'https://cdn.example/7.jpg', price: 1000000,
    finalPrice: 900000, promotion: { name: 'Sale', discountType: 'percentage', discountValue: 10 }, stock: 3,
    category: { name: 'Sofa', slug: 'sofa' }, averageRating: 4.8, reviewCount: 12, reason: 'Lý do từ AI'
  });
  assert.equal(result.recommendations[0].price, 1000000);
  assert.equal(result.recommendations[0].image, 'https://cdn.example/7.jpg');
  assert.equal(result.recommendations[0].slug, 'product-7');
  assert.equal(result.recommendations[0].stock, 3);
});

test('falls back rather than returning a partial provider response when response rebuilding fails', async () => {
  const candidates = [candidate(1)];
  assert.throws(() => rebuildAiProviderResponse({ providerResult: { answer: 'X', recommendations: [{ id: 2, reason: 'Y' }] }, candidates }), (error) => error.code === 'AI_RESPONSE_BUILD_ERROR');
});

test('handles nullable DTO artifacts and fails closed when a provider ID cannot map to a candidate', () => {
  const nullable = candidate(1, { slug: null, image: null });
  const rebuilt = rebuildAiProviderResponse({ providerResult: { answer: 'X', recommendations: [{ id: 1, reason: 'Y' }] }, candidates: [nullable] });
  assert.equal(rebuilt.recommendations[0].slug, null);
  assert.equal(rebuilt.recommendations[0].image, null);
  assert.throws(() => rebuildAiProviderResponse({ providerResult: { answer: 'X', recommendations: [{ id: 99, reason: 'Y' }] }, candidates: [nullable] }), (error) => error.code === 'AI_RESPONSE_BUILD_ERROR');
});

test('builds deterministic fact-grounded fallback from the first five pre-ranked candidates without mutation', () => {
  const candidates = Array.from({ length: 6 }, (_, index) => candidate(index + 1));
  const snapshot = structuredClone(candidates);
  const result = buildDeterministicAiFallback({ candidates });
  assert.equal(result.answer, 'Đây là các gợi ý dựa trên dữ liệu sản phẩm hiện có.');
  assert.deepEqual(result.recommendations.map((item) => item.id), [1, 2, 3, 4, 5]);
  assert.equal(result.recommendations[0].reason, 'Sản phẩm hiện còn hàng.');
  assert.deepEqual(candidates, snapshot);
});
