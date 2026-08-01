import assert from 'node:assert/strict';
import test from 'node:test';
import { applyComparativeEligibility } from '../services/ai-advisor/comparative/eligibility.service.js';
const policy = (hardFilters) => ({ action:'apply', hardFilters:{maxPriceExclusive:null,minPriceExclusive:null,excludedProductIds:[],sizeRelation:null,referenceSize:null,targetProductId:null,...hardFilters},softPreferences:{},reference:{} });
const products = [{id:1,finalPrice:9_000_000,size:'small',name:'large in name',stock:2},{id:2,finalPrice:10_000_000,size:'wide',name:'small in name',stock:2},{id:3,finalPrice:11_000_000,size:'large',description:'kích thước nhỏ',stock:2}];
test('comparative hard filters use strict effective-price boundaries and prior IDs', () => {
  assert.deepEqual(applyComparativeEligibility({candidates:products,policy:policy({maxPriceExclusive:10_000_000})}).candidates.map(x=>x.id),[1]);
  assert.deepEqual(applyComparativeEligibility({candidates:products,policy:policy({minPriceExclusive:10_000_000})}).candidates.map(x=>x.id),[3]);
  assert.deepEqual(applyComparativeEligibility({candidates:products,policy:policy({excludedProductIds:[1,2]})}).candidates.map(x=>x.id),[3]);
  assert.deepEqual(applyComparativeEligibility({candidates:products,policy:policy({sizeRelation:'smaller',referenceSize:'large'})}).candidates.map(x=>x.id),[1,2]);
});

test('comparative size relations use only canonical product.size taxonomy', () => {
  assert.deepEqual(applyComparativeEligibility({ candidates: products, policy: policy({ sizeRelation: 'larger', referenceSize: 'small' }) }).candidates.map((item) => item.id), [2, 3]);
  assert.deepEqual(applyComparativeEligibility({ candidates: products, policy: policy({ sizeRelation: 'smaller', referenceSize: 'wide' }) }).candidates.map((item) => item.id), [1]);
  assert.deepEqual(applyComparativeEligibility({ candidates: products, policy: policy({ sizeRelation: 'larger', referenceSize: 'wide' }) }).candidates.map((item) => item.id), [3]);
});

test('raw name, description, and dimensions never establish a comparative size match', () => {
  const rawOnly = [
    { id: 1, finalPrice: 1, name: 'mẫu mini', description: 'kích thước lớn', dimensions: '20 x 20', stock: 2 },
    { id: 2, finalPrice: 2, name: 'sofa lớn', description: 'mini', dimensions: '200 x 200', stock: 2 }
  ];
  const result = applyComparativeEligibility({ candidates: rawOnly, policy: policy({ sizeRelation: 'larger', referenceSize: 'small' }) });
  assert.deepEqual(result.candidates, []);
  assert.equal(result.diagnostics.beforeComparativeCount, 2);
  assert.equal(result.diagnostics.afterComparativeCount, 0);
});
