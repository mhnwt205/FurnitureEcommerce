import assert from 'node:assert/strict';
import test from 'node:test';
import { createAiAdvisorRouter } from '../routes/aiAdvisor.routes.js';
import { createAiAdvisorController } from '../controllers/aiAdvisor.controller.js';
import { AI_ERROR_CODE, AiContractError } from '../services/ai/aiContracts.js';

const response = () => {
  const state = { statusCode: null, body: null };
  return { state, status(code) { state.statusCode = code; return this; }, json(body) { state.body = body; return this; } };
};

test('controller exposes exactly the public response object and no internal diagnostics', async () => {
  let calls = 0;
  const controller = createAiAdvisorController({ processAiChat: async () => {
    calls += 1;
    return { response: { answer: 'OK', recommendations: [], source: 'must-not-leak' }, internal: { source: 'fallback', providerFailureCode: 'AI_PROVIDER_TIMEOUT', requestId: 'must-not-leak' } };
  } });
  const res = response();
  await controller({ body: { message: 'sofa' } }, res);
  assert.equal(calls, 1);
  assert.equal(res.state.statusCode, 200);
  assert.deepEqual(res.state.body, { answer: 'OK', recommendations: [] });
  assert.deepEqual(Object.keys(res.state.body), ['answer', 'recommendations']);
});

test('controller maps request validation and unavailable/unexpected errors to safe responses', async () => {
  const invalid = createAiAdvisorController({ processAiChat: async () => { throw new AiContractError('AI_REQUEST_VALIDATION_ERROR', 'raw message must not leak'); } });
  const invalidRes = response();
  await invalid({ body: { message: 'bad' } }, invalidRes);
  assert.deepEqual(invalidRes.state, { statusCode: 400, body: { message: 'Yêu cầu không hợp lệ.' } });

  const unavailable = createAiAdvisorController({ processAiChat: async () => { throw Object.assign(new Error('database secret'), { status: 503 }); } });
  const unavailableRes = response();
  await unavailable({ body: {} }, unavailableRes);
  assert.deepEqual(unavailableRes.state, { statusCode: 503, body: { message: 'Dịch vụ tạm thời không khả dụng.' } });

  const unexpected = createAiAdvisorController({ processAiChat: async () => { throw new Error('internal stack must not leak'); } });
  const unexpectedRes = response();
  await unexpected({ body: {} }, unexpectedRes);
  assert.deepEqual(unexpectedRes.state, { statusCode: 500, body: { message: 'Không thể xử lý yêu cầu lúc này.' } });
});

test('controller maps prompt-builder failure to one safe 500 response without leaking internal data', async () => {
  let calls = 0;
  const controller = createAiAdvisorController({ processAiChat: async () => {
    calls += 1;
    throw new AiContractError(AI_ERROR_CODE.promptBuild, 'prompt-secret-test candidate-description-test');
  } });
  const res = response();
  await controller({ body: { message: 'raw-user-message-test' } }, res);

  assert.equal(calls, 1);
  assert.equal(res.state.statusCode, 500);
  assert.deepEqual(Object.keys(res.state.body), ['message']);
  const serialized = JSON.stringify(res.state.body);
  for (const sensitiveValue of ['AI_PROMPT_BUILD_ERROR', 'prompt-secret-test', 'candidate-description-test', 'raw-user-message-test', 'stack', 'provider', 'requestId']) assert.equal(serialized.includes(sensitiveValue), false);
  assert.equal('answer' in res.state.body, false);
  assert.equal('recommendations' in res.state.body, false);
});

test('route mounts POST /chat with the AI rate limiter before the controller', () => {
  const rateLimiter = () => {};
  const controller = () => {};
  const aiAdvisorRoutes = createAiAdvisorRouter({ rateLimiter, controller });
  const chatLayer = aiAdvisorRoutes.stack.find((layer) => layer.route?.path === '/chat');
  assert.ok(chatLayer);
  assert.equal(chatLayer.route.methods.post, true);
  assert.equal(chatLayer.route.methods.get, undefined);
  assert.equal(chatLayer.route.stack.length, 2);
  assert.equal(chatLayer.route.stack[0].handle, rateLimiter);
  assert.equal(chatLayer.route.stack[1].handle, controller);
});
