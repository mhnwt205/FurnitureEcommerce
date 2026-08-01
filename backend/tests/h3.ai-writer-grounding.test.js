import assert from 'node:assert/strict';
import test from 'node:test';
import { validateGroundedWriterOutput } from '../services/ai-advisor/recommendation/reason.service.js';

test('writer grounding keeps only allowed ids and backend-issued reason codes in backend order', () => {
  const allowed = new Map([[1, { reasonCodes: ['budget_match'] }], [2, { reasonCodes: ['in_stock'] }]]);
  const result = validateGroundedWriterOutput({ answer: 'OK', reasons: [{ productId: 2, text: 'Còn hàng.', usedReasonCodes: ['in_stock'] }, { productId: 1, text: 'Đúng giá.', usedReasonCodes: ['budget_match'] }, { productId: 9, text: 'Bịa.', usedReasonCodes: [] }] }, { orderedIds: [1, 2], allowedFacts: allowed });
  assert.equal(result.reasonMap.get(1), 'Đúng giá.');
  assert.equal(result.reasonMap.get(2), 'Còn hàng.');
  assert.equal(result.reasonMap.has(9), false);
  const rejectedReason = validateGroundedWriterOutput({ answer: 'OK', reasons: [{ productId: 1, text: 'Bịa.', usedReasonCodes: ['promotion_active'] }] }, { orderedIds: [1], allowedFacts: allowed });
  assert.equal(rejectedReason.reasonMap.size, 0);
});
