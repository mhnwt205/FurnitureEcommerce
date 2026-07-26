import assert from 'node:assert/strict';
import test from 'node:test';
import { createShutdownController } from '../utils/shutdown.js';

test('shutdown closes resources once, sets readiness false, and clears its deadline', async () => {
  const calls = [];
  let scheduled;
  let cleared = false;
  const processRef = {};
  const exits = [];
  const controller = createShutdownController({
    prisma: { $disconnect: async () => calls.push('prisma') },
    logger: { info: (event) => calls.push(event), error: (event) => calls.push(event) },
    setTimer: (callback, delay) => { scheduled = { callback, delay, run: () => { if (!cleared) callback(); } }; return scheduled; },
    clearTimer: (timer) => { assert.equal(timer, scheduled); cleared = true; },
    exit: (code) => exits.push(code),
    processRef
  });
  controller.setResources({ server: { close: (callback) => { calls.push('http'); callback(); } }, io: { close: async () => calls.push('socket') } });
  const first = controller.shutdown({ reason: 'SIGTERM' });
  const second = controller.shutdown({ reason: 'SIGTERM' });
  assert.equal(first, second);
  assert.equal(controller.getIsShuttingDown(), true);
  await first;
  assert.equal(scheduled.delay, 30_000);
  assert.equal(cleared, true);
  assert.deepEqual(calls.filter((value) => ['socket', 'http', 'prisma'].includes(value)), ['socket', 'http', 'prisma']);
  assert.equal(processRef.exitCode, 0);
  scheduled.run();
  assert.deepEqual(exits, []);
});

test('fatal cleanup failure sets a nonzero exit code and deadline only forces exit when fired', async () => {
  const processRef = {};
  const exits = [];
  let deadline;
  const controller = createShutdownController({
    prisma: { $disconnect: async () => { throw new Error('disconnect failed'); } },
    logger: { info: () => {}, error: () => {} },
    setTimer: (callback, delay) => { deadline = { callback, delay }; return deadline; },
    clearTimer: () => {},
    exit: (code) => exits.push(code),
    processRef
  });
  await controller.shutdown({ reason: 'unhandledRejection', exitCode: 1 });
  assert.equal(processRef.exitCode, 1);
  assert.deepEqual(exits, []);
  deadline.callback();
  assert.deepEqual(exits, [1]);
});
