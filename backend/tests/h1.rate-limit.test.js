import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { requestContext } from '../middlewares/requestContext.middleware.js';
import { aiAdvisorRateLimiter, consultationRequestRateLimiter, uploadRateLimiter } from '../middlewares/publicRateLimit.middleware.js';
import { createUploadRouter } from '../routes/upload.routes.js';

const withServer = async (app, requests) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    return await Promise.all(requests.map(async ({ path = '/', headers = {} } = {}) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', headers });
      return { status: response.status, requestId: response.headers.get('x-request-id'), body: await response.json() };
    }));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test('AI advisor limiter rejects the request after its threshold without calling its handler', async () => {
  let controllerCalls = 0;
  const app = express();
  app.use(requestContext);
  app.post('/', aiAdvisorRateLimiter, (req, res) => { controllerCalls += 1; res.json({ requestId: req.requestId }); });
  const results = await withServer(app, Array.from({ length: 11 }, () => ({})));
  assert.equal(results.filter((result) => result.status === 200).length, 10);
  const rejected = results.at(-1);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.body.requestId, rejected.requestId);
  assert.equal(controllerCalls, 10);
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
