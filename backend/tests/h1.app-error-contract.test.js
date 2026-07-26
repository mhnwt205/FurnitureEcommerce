import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { createApp } from '../app.js';
import { requestContext } from '../middlewares/requestContext.middleware.js';
import { errorHandler } from '../middlewares/error.middleware.js';

const withServer = async (app, path, options = {}) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
    return { status: response.status, headers: response.headers, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const captureLogs = async (callback) => {
  const entries = [];
  const originalLog = console.log;
  const originalError = console.error;
  const capture = (line) => {
    try { entries.push(JSON.parse(line)); } catch { /* ignore non-JSON test output */ }
  };
  console.log = capture;
  console.error = capture;
  try {
    return { result: await callback(), entries };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
};

const assertSingleRequestLog = (entries, requestId) => {
  const matching = entries.filter((entry) => entry.requestId === requestId && ['http_request_completed', 'http_request_failed'].includes(entry.event));
  assert.equal(matching.length, 1);
  assert.equal(matching[0].requestId, requestId);
};

test('generated request ID is shared by a 404 header, body, and completion log', async () => {
  const { result: response, entries } = await captureLogs(() => withServer(createApp(), '/missing'));
  const requestId = response.headers.get('x-request-id');
  assert.match(requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(response.body.requestId, requestId);
  assertSingleRequestLog(entries, requestId);
});

test('invalid inbound request ID is replaced once across a 404 header, body, and completion log', async () => {
  const invalidId = 'short invalid id';
  const { result: response, entries } = await captureLogs(() => withServer(createApp(), '/missing', { headers: { 'X-Request-Id': invalidId } }));
  const requestId = response.headers.get('x-request-id');
  assert.match(requestId, /^[0-9a-f-]{36}$/i);
  assert.notEqual(requestId, invalidId);
  assert.equal(response.body.requestId, requestId);
  assertSingleRequestLog(entries, requestId);
});

test('optional authentication rejection preserves the request ID response contract', async () => {
  const { result: response } = await captureLogs(() => withServer(createApp(), '/api/orders', { method: 'POST', headers: { Authorization: 'not-bearer' } }));
  const requestId = response.headers.get('x-request-id');
  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'Invalid or expired token');
  assert.equal(response.body.requestId, requestId);
});

test('completion logs retain the original path for a mounted router', async () => {
  const { result: response, entries } = await captureLogs(() => withServer(createApp(), '/api/orders', { method: 'POST', headers: { Authorization: 'not-bearer' } }));
  const requestId = response.headers.get('x-request-id');
  const completionLogs = entries.filter((entry) => entry.event === 'http_request_completed' && entry.requestId === requestId);
  assert.equal(response.status, 403);
  assert.equal(completionLogs.length, 1);
  assert.equal(completionLogs[0].path, '/api/orders');
});

test('CORS rejection keeps one request ID and the support-conversation envelope', async () => {
  const previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const previousFrontend = process.env.FRONTEND_URL;
  process.env.CORS_ALLOWED_ORIGINS = 'https://allowed.example.com';
  process.env.FRONTEND_URL = 'https://allowed.example.com';
  try {
    const response = await withServer(createApp(), '/api/support/conversations', { headers: { Origin: 'https://blocked.example.com' } });
    assert.equal(response.status, 403);
    assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/i);
    assert.equal(response.body.requestId, response.headers.get('x-request-id'));
    assert.deepEqual(response.body.error, { code: 'FORBIDDEN', message: 'Origin not allowed by CORS' });
  } finally {
    if (previousOrigins === undefined) delete process.env.CORS_ALLOWED_ORIGINS; else process.env.CORS_ALLOWED_ORIGINS = previousOrigins;
    if (previousFrontend === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = previousFrontend;
  }
});

test('allowed requests retain a valid incoming request ID', async () => {
  const previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
  process.env.CORS_ALLOWED_ORIGINS = 'https://allowed.example.com';
  try {
    const response = await withServer(createApp(), '/health', { headers: { Origin: 'https://allowed.example.com', 'X-Request-Id': 'accepted-request-id' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-request-id'), 'accepted-request-id');
  } finally {
    if (previousOrigins === undefined) delete process.env.CORS_ALLOWED_ORIGINS; else process.env.CORS_ALLOWED_ORIGINS = previousOrigins;
  }
});

for (const status of [400, 401, 403, 404, 413, 429, 500]) {
  test(`central error middleware preserves safe ${status} responses with a request ID`, async () => {
    const app = express();
    app.use(requestContext);
    app.get('/error', () => { const error = new Error('internal detail'); error.status = status; throw error; });
    app.use(errorHandler);
    const response = await withServer(app, '/error', { headers: { 'X-Request-Id': 'central-error-id' } });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('x-request-id'), 'central-error-id');
    assert.equal(response.body.requestId, 'central-error-id');
    assert.equal(response.body.stack, undefined);
  });
}

test('unsupported error statuses become a safe 500 response', async () => {
  const app = express();
  app.use(requestContext);
  app.get('/error', () => { const error = new Error('internal detail'); error.status = 418; throw error; });
  app.use(errorHandler);
  const response = await withServer(app, '/error');
  assert.equal(response.status, 500);
  assert.equal(response.body.message, 'Something went wrong. Please try again later.');
  assert.ok(response.body.requestId);
});

test('central error middleware preserves 409 with one request ID in the error log', async () => {
  const app = express();
  app.use(requestContext);
  app.get('/error', () => { const error = new Error('internal conflict detail'); error.status = 409; throw error; });
  app.use(errorHandler);
  const { result: response, entries } = await captureLogs(() => withServer(app, '/error'));
  const requestId = response.headers.get('x-request-id');
  assert.equal(response.status, 409);
  assert.equal(response.body.message, 'Request conflicts with existing data');
  assert.equal(response.body.requestId, requestId);
  assert.equal(response.body.stack, undefined);
  assertSingleRequestLog(entries, requestId);
});
