import assert from 'node:assert/strict';
import test from 'node:test';
import { createAiTelemetry } from '../services/ai-advisor/telemetry/telemetry.service.js';

test('telemetry rejects unknown metadata and never serializes raw sensitive fixture values', () => {
  const events = [];
  const telemetry = createAiTelemetry({ eventSink: (event) => events.push(event) });
  const sensitive = 'secret-key-123 customer@example.com 0909123456 1 Main Street sofa description';
  const rejected = telemetry.emit('ai_request_started', { ownerType: 'guest', metadata: { rawMessage: sensitive } });
  assert.equal(rejected, null);
  const emitted = telemetry.emit('ai_request_started', { requestId: '11111111-1111-4111-8111-111111111111', sessionId: '22222222-2222-4222-8222-222222222222', ownerType: 'guest', metadata: { messageLength: sensitive.length, intentType: 'product_recommendation', category: 'sofa' } });
  assert.ok(emitted);
  const serialized = JSON.stringify(events);
  for (const value of ['secret-key-123', 'customer@example.com', '0909123456', '1 Main Street', 'sofa description']) assert.equal(serialized.includes(value), false);
  assert.equal(serialized.includes('11111111-1111-4111-8111-111111111111'), true);
});
