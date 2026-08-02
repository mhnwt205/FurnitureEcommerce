import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { getAiConfig } from '../services/ai/aiConfig.js';
import { createAiAdvisorRateLimiter, aiAdvisorIpKey } from '../middlewares/aiAdvisorRateLimit.middleware.js';
import { createAiAdvisorRouter } from '../routes/aiAdvisor.routes.js';
import { requestContext } from '../middlewares/requestContext.middleware.js';

const start = async (app) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
};

const postChat = (url, body = { message: 'sofa' }) => fetch(`${url}/api/ai-advisor/chat`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-request-id': 'rate-limit-test-request' },
  body: JSON.stringify(body)
});

test('uses a dedicated IP quota, returns a safe 429 with Retry-After, and never enters the controller after quota exhaustion', async () => {
  const events = [];
  const limiter = createAiAdvisorRateLimiter({
    config: getAiConfig({ AI_RATE_LIMIT_MAX: '20', AI_RATE_LIMIT_WINDOW_MS: '300000' }),
    loggerImpl: { warn: (event, metadata) => events.push({ event, metadata }) }
  });
  let controllerCalls = 0;
  const app = express();
  app.use(requestContext);
  app.use('/api/ai-advisor', createAiAdvisorRouter({ rateLimiter: limiter, controller: (req, res) => {
    controllerCalls += 1;
    return res.status(200).json({ answer: 'ok', recommendations: [] });
  } }));
  const server = await start(app);
  try {
    for (let index = 0; index < 20; index += 1) assert.equal((await postChat(server.url, { message: `sofa-${index}` })).status, 200);
    const blocked = await postChat(server.url, { message: 'different-body-cannot-bypass' });
    const body = await blocked.json();
    const retryAfter = Number(blocked.headers.get('retry-after'));

    assert.equal(blocked.status, 429);
    assert.equal(Number.isInteger(retryAfter) && retryAfter > 0 && retryAfter <= 300, true);
    assert.ok(blocked.headers.get('ratelimit'));
    assert.ok(blocked.headers.get('ratelimit-policy'));
    assert.deepEqual(Object.keys(body), ['message']);
    assert.equal('answer' in body, false);
    assert.equal('recommendations' in body, false);
    assert.equal(JSON.stringify(body).includes('rate-limit-test-request'), false);
    assert.equal(controllerCalls, 20);
    assert.deepEqual(events, [{ event: 'ai_rate_limit_rejected', metadata: { requestId: 'rate-limit-test-request', ownerType: 'ip', retryAfterSeconds: retryAfter } }]);
  } finally {
    await server.close();
  }
});

test('resets the production limiter after its configured fixed window and keys only by normalized IP identity', async () => {
  const limiter = createAiAdvisorRateLimiter({
    config: getAiConfig({ AI_RATE_LIMIT_MAX: '1', AI_RATE_LIMIT_WINDOW_MS: '1000' }),
    loggerImpl: { warn: () => {} }
  });
  let controllerCalls = 0;
  const app = express();
  app.use('/api/ai-advisor', createAiAdvisorRouter({ rateLimiter: limiter, controller: (req, res) => {
    controllerCalls += 1;
    return res.status(200).json({ answer: 'ok', recommendations: [] });
  } }));
  const server = await start(app);
  try {
    assert.equal((await postChat(server.url, { message: 'first' })).status, 200);
    assert.equal((await postChat(server.url, { message: 'body-does-not-change-key' })).status, 429);
    await new Promise((resolve) => setTimeout(resolve, 1_050));
    assert.equal((await postChat(server.url, { message: 'after-reset' })).status, 200);
    assert.equal(controllerCalls, 2);
  } finally {
    await server.close();
  }

  assert.equal(aiAdvisorIpKey({ ip: '203.0.113.10', body: { sessionId: 'one' } }), aiAdvisorIpKey({ ip: '203.0.113.10', body: { clientMessageId: 'two' } }));
  assert.notEqual(aiAdvisorIpKey({ ip: '203.0.113.10' }), aiAdvisorIpKey({ ip: '203.0.113.11' }));
});

test('uses safe defaults and emits each sanitized AI configuration warning once at limiter initialization', () => {
  const events = [];
  const config = getAiConfig({ AI_RATE_LIMIT_MAX: '0', AI_RATE_LIMIT_WINDOW_MS: 'invalid', GEMINI_API_KEY: 'secret-must-not-leak' });
  const limiter = createAiAdvisorRateLimiter({ config, loggerImpl: { warn: (event, metadata) => events.push({ event, metadata }) } });

  assert.equal(typeof limiter, 'function');
  assert.equal(config.rateLimitMax, 20);
  assert.equal(config.rateLimitWindowMs, 300000);
  assert.deepEqual(events, [
    { event: 'ai_config_default_applied', metadata: { field: 'AI_RATE_LIMIT_MAX', reason: 'safe_default' } },
    { event: 'ai_config_default_applied', metadata: { field: 'AI_RATE_LIMIT_WINDOW_MS', reason: 'safe_default' } }
  ]);
  assert.equal(JSON.stringify(events).includes('secret-must-not-leak'), false);
});
