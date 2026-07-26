import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { createHealthRouter } from '../routes/health.routes.js';

const request = async (router, path) => {
  const app = express();
  app.use((req, res, next) => { req.requestId = 'test-request-id'; next(); });
  app.use(router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
    return { status: response.status, body: await response.json(), cacheControl: response.headers.get('cache-control') };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test('health is dependency-free and returns uptime', async () => {
  const prisma = { $queryRawUnsafe: async () => assert.fail('health must not probe Prisma') };
  const response = await request(createHealthRouter({ prisma }), '/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(typeof response.body.uptime, 'number');
  assert.equal(response.cacheControl, 'no-store');
});

test('readiness returns ready when the database probe succeeds', async () => {
  const response = await request(createHealthRouter({ prisma: { $queryRawUnsafe: async () => [{ ok: 1 }] } }), '/ready');
  assert.deepEqual(response, { status: 200, body: { status: 'ready' }, cacheControl: 'no-store' });
});

test('readiness returns not ready for a rejected probe without exposing the error', async () => {
  const response = await request(createHealthRouter({ prisma: { $queryRawUnsafe: async () => { throw new Error('database password must stay private'); } }, logger: { warn: () => {} } }), '/ready');
  assert.deepEqual(response, { status: 503, body: { status: 'not_ready' }, cacheControl: 'no-store' });
});

test('readiness timeout and a late rejection are handled safely', async () => {
  const unhandled = [];
  const listener = (error) => unhandled.push(error);
  process.on('unhandledRejection', listener);
  try {
    const prisma = { $queryRawUnsafe: () => new Promise((resolve, reject) => setTimeout(() => reject(new Error('late rejection')), 20)) };
    const response = await request(createHealthRouter({ prisma, logger: { warn: () => {} }, timeoutMs: 5 }), '/ready');
    assert.equal(response.status, 503);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', listener);
  }
});

test('readiness returns not ready when shutdown has started', async () => {
  const response = await request(createHealthRouter({ prisma: { $queryRawUnsafe: async () => assert.fail('shutdown must not probe') }, getIsShuttingDown: () => true }), '/ready');
  assert.equal(response.status, 503);
  assert.equal(response.body.status, 'not_ready');
});
