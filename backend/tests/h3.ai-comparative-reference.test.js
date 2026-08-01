import assert from 'node:assert/strict';
import test from 'node:test';
import { extractComparativeSignal } from '../services/ai-advisor/comparative/extraction.service.js';
import { resolveComparativeReference } from '../services/ai-advisor/comparative/reference.service.js';
import { comparativeIntentSchema } from '../services/ai-advisor/comparative/comparative.schema.js';
import { buildComparativePolicy } from '../services/ai-advisor/comparative/policy.service.js';

const context = { productIds: [11, 22, 33, 44, 55], minPrice: 5_000_000, maxPrice: 12_000_000, category: 'sofa', dominantColors: ['cream', 'blue'], dominantSize: null };
const resolve = (message, extra = {}) => resolveComparativeReference({ signal: extractComparativeSignal(message), lastRecommendationContext: context, message, ...extra });

test('ordinal references resolve only within last recommendation ids', () => {
  assert.equal(resolve('mẫu thứ nhất').reference.productId, 11);
  assert.equal(resolve('mẫu đầu tiên').reference.productId, 11);
  assert.equal(resolve('sản phẩm số 3').reference.productId, 33);
  assert.equal(resolve('chọn mẫu 5').reference.productId, 55);
  const invalid = resolve('mẫu thứ sáu');
  assert.equal(invalid.missingReference, true);
  assert.equal(invalid.reference.productId, null);
});

test('reference resolver keeps only bounded context facts and never invents missing facts', () => {
  const cheaper = resolve('rẻ hơn');
  assert.equal(cheaper.reference.source, 'last_recommendations');
  assert.equal(cheaper.reference.maxPrice, 12_000_000);
  assert.equal(cheaper.missingReference, false);
  assert.deepEqual(resolve('màu khác').reference.colors, ['cream', 'blue']);
  assert.equal(resolve('nhỏ hơn').missingReference, true);
  assert.equal(resolve('chất liệu khác').missingReference, true);
  assert.deepEqual(resolve('mẫu khác').reference.productIds, [11, 22, 33, 44, 55]);
  const stock = resolve('sản phẩm thứ hai còn hàng không');
  assert.equal(stock.reference.productId, 22);
  assert.equal(stock.type, 'stock_check');
});

test('current product is used only for explicit this-product references and inputs remain immutable', () => {
  const before = structuredClone(context);
  const current = resolve('mẫu này còn hàng không', { currentProductId: 88 });
  assert.equal(current.reference.source, 'current_product');
  assert.equal(current.reference.productId, 88);
  assert.deepEqual(context, before);
  const missing = resolveComparativeReference({ signal: extractComparativeSignal('rẻ hơn'), lastRecommendationContext: {}, message: 'rẻ hơn' });
  assert.equal(missing.missingReference, true);
  assert.equal(missing.reference.productId, null);
});

test('comparative contract is strict and canonicalizes only bounded context values', () => {
  assert.throws(() => comparativeIntentSchema.parse({ type: 'cheaper', reference: {}, confidence: 1, ambiguous: false, missingReference: false, extra: true }));
  assert.throws(() => comparativeIntentSchema.parse({ type: 'unbounded', reference: {}, confidence: 1, ambiguous: false, missingReference: false }));
  const resolved = resolveComparativeReference({
    signal: extractComparativeSignal('màu khác'),
    lastRecommendationContext: { productIds: [1, 1, 2, 3, 4, 5, 6], minPrice: 1, maxPrice: 2, category: 'Sofa', dominantColors: ['blue', 'blue', 'unknown'] },
    message: 'màu khác'
  });
  assert.deepEqual(resolved.reference.productIds, [1, 2, 3, 4, 5]);
  assert.deepEqual(resolved.reference.colors, ['blue']);
  assert.equal(resolved.reference.category, 'sofa');
});

test('size reference is missing unless last recommendation context has a canonical dominantSize', () => {
  const signal = extractComparativeSignal('nhỏ hơn');
  const inferred = resolveComparativeReference({
    signal,
    lastRecommendationContext: { productIds: [1], dominantSize: 'unknown', name: 'mẫu nhỏ', dimensions: '20 x 20' },
    message: 'nhỏ hơn'
  });
  assert.equal(inferred.missingReference, true);
  assert.equal(inferred.reference.size, null);
  const canonical = resolveComparativeReference({ signal, lastRecommendationContext: { productIds: [1], dominantSize: 'wide' }, message: 'nhỏ hơn' });
  assert.equal(canonical.missingReference, false);
  assert.equal(canonical.reference.size, 'wide');
});

test('missing canonical comparative size produces clarify_missing_reference instead of a hard size filter', () => {
  const comparativeState = resolveComparativeReference({
    signal: extractComparativeSignal('lớn hơn'),
    lastRecommendationContext: { productIds: [1], dominantSize: null, name: 'mẫu lớn' },
    message: 'lớn hơn'
  });
  const policy = buildComparativePolicy({ comparativeState, productPrices: [], currentProduct: null });
  assert.equal(policy.action, 'clarify_missing_reference');
  assert.equal(policy.hardFilters.sizeRelation, null);
});
