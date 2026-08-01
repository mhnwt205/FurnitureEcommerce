import assert from 'node:assert/strict';
import test from 'node:test';
import { extractComparativeSignal } from '../services/ai-advisor/comparative/extraction.service.js';

test('comparative extractor recognizes the bounded Vietnamese phrase set deterministically', () => {
  const cases = [['rẻ hơn', 'cheaper'], ['đắt hơn', 'more_expensive'], ['màu khác', 'different_color'], ['chất liệu khác', 'different_material'], ['phong cách khác', 'different_style'], ['nhỏ hơn', 'smaller'], ['lớn hơn', 'larger'], ['mẫu khác', 'different_product'], ['giống mẫu trước', 'similar_to_previous'], ['còn hàng không', 'stock_check'], ['tìm sofa xanh', 'none']];
  for (const [message, type] of cases) assert.equal(extractComparativeSignal(message).type, type, message);
  assert.equal(extractComparativeSignal('cao cấp hơn').ambiguous, true);
  assert.equal(extractComparativeSignal('cách diễn đạt lạ').type, 'none');
});

test('comparative extractor parses only bounded ordinals', () => {
  assert.equal(extractComparativeSignal('mẫu đầu tiên').ordinal, 1);
  assert.equal(extractComparativeSignal('mẫu thứ hai').ordinal, 2);
  assert.equal(extractComparativeSignal('sản phẩm số 3').ordinal, 3);
  assert.equal(extractComparativeSignal('chọn mẫu 5').ordinal, 5);
  const invalid = extractComparativeSignal('mẫu thứ sáu');
  assert.equal(invalid.type, 'ordinal_product');
  assert.equal(invalid.ordinal, null);
  assert.equal(invalid.ambiguous, true);
});
