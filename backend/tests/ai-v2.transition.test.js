import assert from 'node:assert/strict';
import test from 'node:test';
import { AiContractError } from '../services/ai/aiContracts.js';
import { applyAiStateTransition, emptyAiConversationProfile } from '../services/ai/aiConversation.service.js';
import { parseAiStateTransition } from '../services/ai/aiValidation.js';

const expectInvalid = (value) => assert.throws(
  () => parseAiStateTransition(value),
  (error) => error instanceof AiContractError && error.code === 'AI_STATE_TRANSITION_INVALID'
);

test('validates refine, replace, and reset state transitions strictly', () => {
  assert.deepEqual(parseAiStateTransition({ operation: 'refine', clear: ['budgetMax'], set: { budgetMin: 5_000_000 } }), { operation: 'refine', clear: ['budgetMax'], set: { budgetMin: 5_000_000 } });
  assert.deepEqual(parseAiStateTransition({ operation: 'replace', clear: [], set: { productType: 'bed', room: 'bedroom' } }), { operation: 'replace', clear: [], set: { productType: 'bed', room: 'bedroom' } });
  assert.deepEqual(parseAiStateTransition({ operation: 'reset', clear: [], set: {} }), { operation: 'reset', clear: [], set: {} });
});

test('rejects unsafe, contradictory, unknown, duplicate, and conflicting transitions', () => {
  for (const value of [
    { operation: 'unknown', clear: [], set: {} },
    { operation: 'refine', clear: ['productId'], set: {} },
    { operation: 'refine', clear: ['budgetMax', 'budgetMax'], set: {} },
    { operation: 'refine', clear: ['budgetMax'], set: { budgetMax: 5 } },
    { operation: 'refine', clear: [], set: { sql: 'DELETE FROM Product' } },
    { operation: 'refine', clear: [], set: { budgetMin: -1 } },
    { operation: 'refine', clear: [], set: { colors: Array(7).fill('gray') } },
    { operation: 'reset', clear: ['room'], set: {} },
    { operation: 'refine', clear: [], set: { __proto__: { polluted: true } } }
  ]) expectInvalid(value);
});

test('applies a replacement without retaining a contradictory stale maximum budget', () => {
  const stored = { ...emptyAiConversationProfile(), productType: 'sofa', room: 'living_room', budgetMax: 5_000_000, household: ['pets'] };
  const transition = parseAiStateTransition({ operation: 'replace', clear: ['budgetMax'], set: { productType: 'bed', room: 'bedroom', budgetMin: 5_000_000 } });
  const next = applyAiStateTransition(stored, transition);
  assert.deepEqual(next, { ...emptyAiConversationProfile(), productType: 'bed', room: 'bedroom', budgetMin: 5_000_000, household: ['pets'] });
  assert.deepEqual(stored, { ...emptyAiConversationProfile(), productType: 'sofa', room: 'living_room', budgetMax: 5_000_000, household: ['pets'] });
});

test('resets to the canonical empty profile and rejects conflicting budget ranges', () => {
  assert.deepEqual(applyAiStateTransition({ ...emptyAiConversationProfile(), productType: 'sofa' }, parseAiStateTransition({ operation: 'reset', clear: [], set: {} })), emptyAiConversationProfile());
  assert.throws(() => applyAiStateTransition(emptyAiConversationProfile(), { operation: 'refine', clear: [], set: { budgetMin: 10, budgetMax: 5 } }), /invalid/i);
});
