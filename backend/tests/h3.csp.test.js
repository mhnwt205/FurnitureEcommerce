import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createApp } from '../app.js';

test('CSP report-only header inventories approved frontend, Google, and Cloudinary sources', async () => {
  const previous = process.env.CORS_ALLOWED_ORIGINS;
  process.env.CORS_ALLOWED_ORIGINS = 'https://shop.example.com';
  const server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
    const policy = response.headers.get('content-security-policy-report-only');
    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /https:\/\/shop\.example\.com/);
    assert.match(policy, /https:\/\/accounts\.google\.com/);
    assert.match(policy, /https:\/\/res\.cloudinary\.com/);
    assert.equal(response.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.CORS_ALLOWED_ORIGINS; else process.env.CORS_ALLOWED_ORIGINS = previous;
  }
});
