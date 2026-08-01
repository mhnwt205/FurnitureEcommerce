import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyAdvisorConstraints } from '../services/ai-advisor/intent/constraint-classification.service.js';

const intent = (overrides = {}) => ({
  intentType: 'product_recommendation', category: 'sofa', budget: { min: null, max: 15_000_000, currency: 'VND' },
  room: null, style: null, size: null, colors: [], materials: [], stockRequired: false, sortPreference: null,
  confidence: 0.8, missingImportantFields: [], ambiguousFields: [], constraints: [], ...overrides
});
const classify = (overrides = {}) => classifyAdvisorConstraints({ intent: intent(overrides.intent), fieldMeta: overrides.fieldMeta || {}, operations: overrides.operations || {}, excluded: overrides.excluded || {} });

test('classification makes category, explicit budget, stockRequired, and exclusions hard', () => {
  const result = classify({ intent: { stockRequired: true }, excluded: { colors: ['white'] } });
  assert.equal(result.hard.category, 'sofa');
  assert.deepEqual(result.hard.budget, { min: null, max: 15_000_000, currency: 'VND' });
  assert.equal(result.hard.stockRequired, true);
  assert.deepEqual(result.hard.exclusions.colors, ['white']);
});

test('ordinary extracted preferences stay soft while explicit strength makes them hard', () => {
  const soft = classify({ intent: { colors: ['blue'], materials: ['wood'], room: 'living_room' } });
  assert.deepEqual(soft.hard.colors, []);
  assert.deepEqual(soft.soft.colors, ['blue']);
  assert.deepEqual(soft.soft.materials, ['wood']);
  assert.equal(soft.soft.room, 'living_room');

  const hard = classify({ intent: { colors: ['blue'], materials: ['wood'] }, operations: { strengths: { colors: 'required', materials: 'required' } } });
  assert.deepEqual(hard.hard.colors, ['blue']);
  assert.deepEqual(hard.hard.materials, ['wood']);
  assert.deepEqual(hard.soft.colors, []);
});

test('classification retains prior required metadata, clears absent fields, and excludes unknown taxonomy', () => {
  const prior = classify({ intent: { colors: ['blue'] }, fieldMeta: { colors: { strength: 'required' } } });
  assert.deepEqual(prior.hard.colors, ['blue']);
  const cleared = classify({ intent: { colors: [] }, fieldMeta: {} });
  assert.deepEqual(cleared.hard.colors, []);
  const unknown = classify({ intent: { colors: ['purple'], materials: ['unknown'] }, excluded: { colors: ['purple'] } });
  assert.deepEqual(unknown.hard.colors, []);
  assert.deepEqual(unknown.soft.colors, []);
  assert.deepEqual(unknown.hard.exclusions.colors, []);
});

test('classification output is strict and deterministic', () => {
  const first = classify({ intent: { colors: ['blue'] } });
  const second = classify({ intent: { colors: ['blue'] } });
  assert.deepEqual(first, second);
  assert.throws(() => classifyAdvisorConstraints({ intent: intent(), fieldMeta: {}, operations: {}, excluded: {}, extra: true }));
});
