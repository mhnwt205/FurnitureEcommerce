import assert from 'node:assert/strict';
import test from 'node:test';
import { createAiAdvisorController } from '../controllers/aiAdvisor.controller.js';

const response = () => {
  const state = { statusCode: null, body: null };
  return { state, status(code) { state.statusCode = code; return this; }, json(body) { state.body = body; return this; } };
};

test('writes bounded AI completion diagnostics without raw request or catalog data', async () => {
  const events = [];
  const controller = createAiAdvisorController({
    processAiChat: async () => ({ response: { answer: 'private answer', recommendations: [{ id: 1 }] }, internal: { providerFallbackUsed: true, providerFailureCode: 'AI_PROVIDER_HTTP_ERROR', providerFailureStatus: 403, source: 'fallback' } }),
    loggerImpl: { info: (event, metadata) => events.push({ event, metadata }) },
    now: (() => { let value = 100; return () => (value += 25); })()
  });
  const res = response();
  await controller({ requestId: 'safe-request-id', body: { message: 'raw-message', prompt: 'prompt-secret', catalog: 'candidate-description' } }, res);

  assert.deepEqual(res.state.body, { answer: 'private answer', recommendations: [{ id: 1 }] });
  assert.deepEqual(events, [{ event: 'ai_request_completed', metadata: { requestId: 'safe-request-id', statusCode: 200, durationMs: 25, recommendationCount: 1, providerFallbackUsed: true, providerFailureCode: 'AI_PROVIDER_HTTP_ERROR', providerFailureStatus: 403, providerOutcome: 'fallback', resolverFallbackUsed: false, staleBudgetCleared: false } }]);
  assert.equal(JSON.stringify(events).includes('raw-message'), false);
  assert.equal(JSON.stringify(events).includes('prompt-secret'), false);
  assert.equal(JSON.stringify(events).includes('candidate-description'), false);
  assert.equal(JSON.stringify(events).includes('AI_PROVIDER_HTTP_ERROR'), true);
});

test('keeps AI responses intact when the sanitized operational logger throws', async () => {
  const controller = createAiAdvisorController({
    processAiChat: async () => ({ response: { answer: 'ok', recommendations: [] }, internal: { providerFallbackUsed: false, providerFailureCode: null, source: 'provider' } }),
    loggerImpl: { info: () => { throw new Error('logger failure'); } }
  });
  const res = response();
  await controller({ requestId: 'safe-request-id', body: { message: 'raw-message' } }, res);
  assert.deepEqual(res.state, { statusCode: 200, body: { answer: 'ok', recommendations: [] } });
});

test('logs prompt failures with a bounded category and keeps the generic 500 public body', async () => {
  const events = [];
  const controller = createAiAdvisorController({
    processAiChat: async () => { throw Object.assign(new Error('prompt-secret candidate-description'), { code: 'AI_PROMPT_BUILD_ERROR' }); },
    loggerImpl: { error: (event, metadata) => events.push({ event, metadata }) },
    now: (() => { let value = 10; return () => (value += 10); })()
  });
  const res = response();
  await controller({ requestId: 'safe-request-id', body: { message: 'raw-message' } }, res);

  assert.equal(res.state.statusCode, 500);
  assert.deepEqual(events, [{ event: 'ai_request_failed', metadata: { requestId: 'safe-request-id', statusCode: 500, durationMs: 10, errorCode: 'prompt_build_failure' } }]);
  assert.equal(JSON.stringify(res.state.body).includes('prompt-secret'), false);
  assert.equal(JSON.stringify(events).includes('prompt-secret'), false);
});
