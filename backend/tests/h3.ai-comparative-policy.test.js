import assert from 'node:assert/strict';
import test from 'node:test';
import { buildComparativePolicy } from '../services/ai-advisor/comparative/policy.service.js';
const state = (type, overrides = {}) => ({ type, reference: { source:'ordinal_recommendation', productId:2, productIds:[2,3], ordinal:2, category:'sofa', minPrice:5_000_000, maxPrice:10_000_000, colors:['blue'], materials:['wood'], style:'modern', size:'large', ...overrides }, confidence:.9, ambiguous:false, missingReference:false });
const policy = (type, input={}) => buildComparativePolicy({ comparativeState: state(type), productPrices:[{productId:2,effectivePrice:10_000_000}], ...input });
test('comparative policy handlers build strict price, product, size, soft, stock and none policies', () => {
  assert.equal(policy('cheaper').hardFilters.maxPriceExclusive, 10_000_000);
  assert.equal(policy('more_expensive').hardFilters.minPriceExclusive, 10_000_000);
  assert.deepEqual(policy('different_product').hardFilters.excludedProductIds, [2,3]);
  assert.equal(policy('smaller').hardFilters.sizeRelation, 'smaller');
  assert.equal(policy('larger').hardFilters.referenceSize, 'large');
  assert.equal(policy('different_color').softPreferences.preferDifferentColor, true);
  assert.equal(policy('different_material').softPreferences.preferDifferentMaterial, true);
  assert.equal(policy('different_style').softPreferences.preferDifferentStyle, true);
  assert.equal(policy('similar_to_previous').softPreferences.preferSimilarCategory, 'sofa');
  assert.equal(policy('stock_check').action, 'stock_check');
  assert.equal(buildComparativePolicy({ comparativeState: state('none'), productPrices:[] }).action, 'none');
});
test('comparative price and size handlers clarify rather than invent a missing reference', () => {
  assert.equal(buildComparativePolicy({ comparativeState: state('cheaper', { productId:null, productIds:[] }), productPrices:[] }).action, 'clarify_missing_reference');
  assert.equal(buildComparativePolicy({ comparativeState: state('larger', { size:null }), productPrices:[{productId:2,effectivePrice:10}] }).action, 'clarify_missing_reference');
  assert.throws(() => buildComparativePolicy({ comparativeState: state('cheaper'), productPrices:[], unexpected:true }));
});
