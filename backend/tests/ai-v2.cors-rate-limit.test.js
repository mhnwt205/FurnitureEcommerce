import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createApp } from '../app.js';
import { getAiConfig } from '../services/ai/aiConfig.js';
import { createAiAdvisorRateLimiter } from '../middlewares/aiAdvisorRateLimit.middleware.js';
import { createAiAdvisorRouter } from '../routes/aiAdvisor.routes.js';

const exposedHeaderNames = (response) => new Set(
  (response.headers.get('access-control-expose-headers') || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

const withApp = async (options, run) => {
  const server = http.createServer(createApp(options));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test('approved cross-origin responses expose only the approved rate-limit countdown headers', async () => {
  const previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
  process.env.CORS_ALLOWED_ORIGINS = 'https://shop.example.com';
  try {
    await withApp({}, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`, { headers: { origin: 'https://shop.example.com' } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), 'https://shop.example.com');
      const exposed = exposedHeaderNames(response);
      for (const name of ['retry-after', 'ratelimit', 'ratelimit-policy']) assert.equal(exposed.has(name), true);
    });
  } finally {
    if (previousOrigins === undefined) delete process.env.CORS_ALLOWED_ORIGINS; else process.env.CORS_ALLOWED_ORIGINS = previousOrigins;
  }
});

test('approved cross-origin AI 429 exposes readable countdown headers without changing the safe body or calling the blocked controller', async () => {
  const previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
  process.env.CORS_ALLOWED_ORIGINS = 'https://shop.example.com';
  let controllerCalls = 0;
  const limiter = createAiAdvisorRateLimiter({
    config: getAiConfig({ AI_RATE_LIMIT_MAX: '1', AI_RATE_LIMIT_WINDOW_MS: '1000' }),
    loggerImpl: { warn: () => {} }
  });
  const aiAdvisorRouter = createAiAdvisorRouter({ rateLimiter: limiter, controller: (req, res) => {
    controllerCalls += 1;
    return res.status(200).json({ answer: 'ok', recommendations: [] });
  } });
  try {
    await withApp({ aiAdvisorRouter }, async (baseUrl) => {
      const request = () => fetch(`${baseUrl}/api/ai-advisor/chat`, {
        method: 'POST',
        headers: { origin: 'https://shop.example.com', 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'sofa' })
      });
      assert.equal((await request()).status, 200);
      const blocked = await request();
      const body = await blocked.json();
      const exposed = exposedHeaderNames(blocked);

      assert.equal(blocked.status, 429);
      assert.equal(blocked.headers.get('access-control-allow-origin'), 'https://shop.example.com');
      for (const name of ['retry-after', 'ratelimit', 'ratelimit-policy']) {
        assert.equal(exposed.has(name), true);
        assert.ok(blocked.headers.get(name));
      }
      assert.equal(Number.isInteger(Number(blocked.headers.get('retry-after'))) && Number(blocked.headers.get('retry-after')) > 0, true);
      assert.deepEqual(Object.keys(body), ['message']);
      assert.equal(JSON.stringify(body).includes('requestId'), false);
      assert.equal(controllerCalls, 1);

      const preflight = await fetch(`${baseUrl}/api/ai-advisor/chat`, {
        method: 'OPTIONS',
        headers: { origin: 'https://shop.example.com', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' }
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://shop.example.com');
      assert.match(preflight.headers.get('access-control-allow-methods') || '', /POST/);
    });
  } finally {
    if (previousOrigins === undefined) delete process.env.CORS_ALLOWED_ORIGINS; else process.env.CORS_ALLOWED_ORIGINS = previousOrigins;
  }
});

test('disallowed origins are not granted CORS access and no-origin requests retain normal behavior', async () => {
  const previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
  process.env.CORS_ALLOWED_ORIGINS = 'https://shop.example.com';
  try {
    await withApp({}, async (baseUrl) => {
      const rejected = await fetch(`${baseUrl}/health`, { headers: { origin: 'https://untrusted.example.com' } });
      assert.equal(rejected.headers.get('access-control-allow-origin'), null);
      assert.equal(rejected.status, 403);

      const sameOrigin = await fetch(`${baseUrl}/health`);
      assert.equal(sameOrigin.status, 200);
      assert.equal(sameOrigin.headers.get('access-control-allow-origin'), null);
    });
  } finally {
    if (previousOrigins === undefined) delete process.env.CORS_ALLOWED_ORIGINS; else process.env.CORS_ALLOWED_ORIGINS = previousOrigins;
  }
});
