import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { requestContext } from '../middlewares/requestContext.middleware.js';
import { aiAdvisorRateLimiter, consultationRequestRateLimiter, createAiAdvisorRateLimiter, uploadRateLimiter } from '../middlewares/publicRateLimit.middleware.js';
import { createUploadRouter } from '../routes/upload.routes.js';
import { snapshotAiMetrics } from '../services/ai-advisor/telemetry/metrics.service.js';

const withServer = async (app, requests) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    return await Promise.all(requests.map(async ({ path = '/', headers = {} } = {}) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', headers });
      return {
        status: response.status,
        requestId: response.headers.get('x-request-id'),
        retryAfter: response.headers.get('retry-after'),
        rateLimit: response.headers.get('ratelimit'),
        rateLimitPolicy: response.headers.get('ratelimit-policy'),
        body: await response.json()
      };
    }));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test('AI advisor limiter allows 20 requests in five minutes then rejects request 21 with standard headers', async () => {
  let controllerCalls = 0;
  const app = express();
  app.use(requestContext);
  app.post('/', aiAdvisorRateLimiter, (req, res) => { controllerCalls += 1; res.json({ requestId: req.requestId }); });
  const results = await withServer(app, Array.from({ length: 21 }, () => ({})));
  assert.equal(results.filter((result) => result.status === 200).length, 20);
  const rejected = results.at(-1);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.body.requestId, rejected.requestId);
  assert.ok(Number(rejected.retryAfter) > 0 && Number(rejected.retryAfter) <= 300);
  assert.ok(rejected.rateLimit);
  assert.ok(rejected.rateLimitPolicy);
  assert.equal(controllerCalls, 20);
  const metric = snapshotAiMetrics().counters.find((item) => item.name === 'ai_rate_limit_rejections_total');
  assert.equal(metric?.labels.ownerType, 'guest');
  assert.equal(Object.hasOwn(metric?.labels || {}, 'ip'), false);
});

test('AI advisor limiter resets its fixed expiry window and does not limit unrelated routes', async () => {
  const app = express();
  const limiter = createAiAdvisorRateLimiter({ limit: 1, windowMs: 30 });
  app.use(requestContext);
  app.post('/ai', limiter, (req, res) => res.json({ requestId: req.requestId }));
  app.post('/other', (req, res) => res.json({ requestId: req.requestId }));

  const first = await withServer(app, [{ path: '/ai' }]);
  assert.equal(first[0].status, 200);
  const rejected = await withServer(app, [{ path: '/ai' }]);
  assert.equal(rejected[0].status, 429);
  const unrelated = await withServer(app, [{ path: '/other' }]);
  assert.equal(unrelated[0].status, 200);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const afterReset = await withServer(app, [{ path: '/ai' }]);
  assert.equal(afterReset[0].status, 200);
});

test('AI advisor limiter counts ordinary, option, retry, and reset POSTs as normal requests', async () => {
  const app = express();
  const limiter = createAiAdvisorRateLimiter({ limit: 4, windowMs: 1_000 });
  app.use(requestContext);
  app.post('/chat', limiter, (req, res) => res.json({ requestId: req.requestId }));
  const results = await withServer(app, [
    { path: '/chat' }, { path: '/chat?option=1' }, { path: '/chat?retry=1' }, { path: '/chat?reset=1' }, { path: '/chat' }
  ]);
  assert.deepEqual(results.map((result) => result.status), [200, 200, 200, 200, 429]);
});

test('consultation creation limiter rejects only after its threshold', async () => {
  let controllerCalls = 0;
  const app = express();
  app.use(requestContext);
  app.post('/', consultationRequestRateLimiter, (req, res) => { controllerCalls += 1; res.json({ requestId: req.requestId }); });
  const results = await withServer(app, Array.from({ length: 6 }, () => ({})));
  assert.equal(results.filter((result) => result.status === 200).length, 5);
  assert.equal(results.at(-1).status, 429);
  assert.equal(results.at(-1).body.requestId, results.at(-1).requestId);
  assert.equal(controllerCalls, 5);
});

test('actual products upload route runs auth before its limiter and rejects before permission or Multer', async () => {
  const calls = [];
  let permissionCalls = 0;
  let multerCalls = 0;
  const auth = (req, res, next) => {
    calls.push(`auth:${req.headers['x-test-user']}`);
    req.user = { id: Number(req.headers['x-test-user']) };
    next();
  };
  const permissionFactory = () => (req, res, next) => {
    permissionCalls += 1;
    calls.push('permission');
    next();
  };
  const fakeMulter = {
    single: () => (req, res, next) => {
      multerCalls += 1;
      calls.push('multer');
      req.file = { path: 'test-image', mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) };
      next();
    }
  };
  const app = express();
  app.use(requestContext);
  app.use('/api/uploads', createUploadRouter({
    verifyTokenMiddleware: auth,
    uploadRateLimiterMiddleware: uploadRateLimiter,
    requireAnyPermissionMiddleware: permissionFactory,
    productUploadMiddleware: fakeMulter,
    uploadImageMiddleware: async (file) => file.path
  }));

  const requests = Array.from({ length: 30 }, () => ({ path: '/api/uploads/products', headers: { 'X-Test-User': '711' } }));
  requests.push({ path: '/api/uploads/products', headers: { 'X-Test-User': '712' } });
  requests.push({ path: '/api/uploads/products', headers: { 'X-Test-User': '711' } });
  const results = await withServer(app, requests);

  assert.equal(results.slice(0, 31).every((result) => result.status === 200), true);
  const rejected = results.at(-1);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.body.requestId, rejected.requestId);
  assert.deepEqual(calls.slice(0, 3), ['auth:711', 'permission', 'multer']);
  assert.equal(permissionCalls, 31);
  assert.equal(multerCalls, 31);
  assert.equal(calls.at(-1), 'auth:711');
});

test('upload limiter runs after authentication and rejects before multipart work', async () => {
  let multipartCalls = 0;
  const app = express();
  app.use(requestContext);
  app.post('/', (req, res, next) => { req.user = { id: 991 }; next(); }, uploadRateLimiter, (req, res) => {
    multipartCalls += 1;
    res.json({ requestId: req.requestId });
  });
  const results = await withServer(app, Array.from({ length: 31 }, () => ({})));
  assert.equal(results.filter((result) => result.status === 200).length, 30);
  assert.equal(results.at(-1).status, 429);
  assert.equal(results.at(-1).body.requestId, results.at(-1).requestId);
  assert.equal(multipartCalls, 30);
});
