import assert from 'node:assert/strict';
import test from 'node:test';
import { AiOverallDeadlineExceeded, createAiRequestDeadline } from '../services/ai/aiDeadline.service.js';

test('caps every stage to the common remaining request budget', () => {
  let clock = 1_000;
  const deadline = createAiRequestDeadline({ timeoutMs: 12_000, now: () => clock });
  assert.equal(deadline.capTimeout(3_000), 3_000);
  clock += 4_500;
  assert.equal(deadline.capTimeout(7_000), 7_000);
  clock += 4_000;
  assert.equal(deadline.capTimeout(7_000), 3_500);
});

test('rejects a stage at the overall deadline and clears its timer', async () => {
  let fired;
  let cleared;
  const deadline = createAiRequestDeadline({
    timeoutMs: 10,
    now: () => 0,
    setTimeoutImpl: (fn) => { fired = fn; return 'deadline-timer'; },
    clearTimeoutImpl: (timer) => { cleared = timer; }
  });
  const pending = deadline.run(() => new Promise(() => {}));
  fired();
  await assert.rejects(pending, AiOverallDeadlineExceeded);
  assert.equal(cleared, 'deadline-timer');
});

test('does not start a retry or another stage once the deadline is exhausted', () => {
  let clock = 10;
  const deadline = createAiRequestDeadline({ timeoutMs: 1, now: () => clock });
  clock = 11;
  assert.throws(() => deadline.assertRemaining(), AiOverallDeadlineExceeded);
  assert.throws(() => deadline.capTimeout(7_000), AiOverallDeadlineExceeded);
});
