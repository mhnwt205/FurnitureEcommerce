import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createApp } from '../app.js';

test('metrics endpoint is token protected and exposes bounded HTTP aggregates', async () => {
  const previous = process.env.METRICS_TOKEN;
  process.env.METRICS_TOKEN = 'metrics-test-token';
  const server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/metrics`)).status, 404);
    await fetch(`${base}/health`);
    const response = await fetch(`${base}/metrics`, { headers: { Authorization: 'Bearer metrics-test-token' } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(body.http.some((entry) => entry.key === 'GET:/health:2xx'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previous === undefined) delete process.env.METRICS_TOKEN; else process.env.METRICS_TOKEN = previous;
  }
});
