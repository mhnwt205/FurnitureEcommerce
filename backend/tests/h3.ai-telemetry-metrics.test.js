import assert from 'node:assert/strict';
import test from 'node:test';
import { AiMetricsRegistry } from '../services/ai-advisor/telemetry/metrics.service.js';
import { createAiTelemetry } from '../services/ai-advisor/telemetry/telemetry.service.js';

test('AI metrics aggregate bounded counters and summaries without high-cardinality labels', () => {
  const metrics = new AiMetricsRegistry();
  const telemetry = createAiTelemetry({ metrics, eventSink: () => {} });
  telemetry.emit('ai_request_started', { requestId: '11111111-1111-4111-8111-111111111111', sessionId: '22222222-2222-4222-8222-222222222222', ownerType: 'guest', metadata: { messageLength: 42 } });
  telemetry.emit('ai_candidate_pipeline_completed', { ownerType: 'guest', durationMs: 12, metadata: { primaryCount: 4, retrievedCount: 4, candidateCount: 3, fallbackReason: 'none' } });
  telemetry.emit('ai_recommendation_returned', { ownerType: 'guest', metadata: { intentType: 'product_recommendation', recommendationCount: 2 } });
  telemetry.emit('ai_request_completed', { ownerType: 'guest', durationMs: 20, outcome: 'recommendation', metadata: { candidateCount: 3, recommendationCount: 2 } });
  const snapshot = metrics.snapshot();
  assert.equal(snapshot.counters.find((item) => item.name === 'ai_requests_total')?.value, 1);
  assert.equal(snapshot.counters.find((item) => item.name === 'ai_recommendations_total')?.value, 1);
  assert.equal(snapshot.summaries.find((item) => item.name === 'ai_request_duration_ms')?.count, 1);
  assert.equal(snapshot.summaries.find((item) => item.name === 'ai_stage1_duration_ms')?.sum, 12);
  assert.equal(snapshot.summaries.find((item) => item.name === 'ai_candidate_count')?.sum, 3);
  assert.ok(snapshot.counters.every((item) => !JSON.stringify(item.labels).includes('11111111') && !JSON.stringify(item.labels).includes('22222222')));
});

test('unknown metric labels collapse to unknown rather than creating unbounded series', () => {
  const metrics = new AiMetricsRegistry();
  metrics.increment('ai_requests_total', { outcome: 'untrusted-user-input', userId: '88', sessionId: 'session-1' });
  const entry = metrics.snapshot().counters.find((item) => item.name === 'ai_requests_total');
  assert.deepEqual(entry.labels, { outcome: 'unknown' });
});

test('telemetry sink and metrics failures are isolated from callers', () => {
  const telemetry = createAiTelemetry({ eventSink: () => { throw new Error('sink failure'); }, metrics: { recordEvent: () => { throw new Error('metric failure'); } }, logger: { warn: () => {} } });
  assert.doesNotThrow(() => telemetry.emit('ai_request_started', { ownerType: 'guest', metadata: { messageLength: 1 } }));
});
