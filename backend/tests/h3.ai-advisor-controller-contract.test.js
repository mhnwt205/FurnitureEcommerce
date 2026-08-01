import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { createChatWithAdvisor } from '../controllers/aiAdvisor.controller.js';

const request = async (handler, body) => {
  const app = express(); app.use(express.json()); app.post('/api/ai-advisor/chat', handler);
  const server = http.createServer(app); await new Promise((resolve) => server.listen(0, resolve));
  try { const response = await fetch(`http://127.0.0.1:${server.address().port}/api/ai-advisor/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() }; } finally { await new Promise((resolve) => server.close(resolve)); }
};
const session = { isNew: false, turnCount: 1, expiresAt: '2026-01-02T00:00:00.000Z' };
const id = '00000000-0000-4000-8000-000000000001';

test('controller preserves additive clarification, relaxation, recommendation, and terminal response contracts', async () => {
  const cases = [
    { type: 'clarification', answer: 'Bạn cần loại nào?', recommendations: [], sessionId: id, question: { field: 'category', text: 'Bạn cần loại nào?', options: ['Sofa'] }, session },
    { type: 'relaxation_proposal', answer: 'Chọn phương án nới điều kiện.', recommendations: [], sessionId: id, relaxation: { proposalId: 'rel-1', reasonCode: 'no_budget_match', options: [{ id: 'budget-1', label: 'Tăng ngân sách' }] }, session },
    { type: 'recommendation', answer: 'Đây là gợi ý.', recommendations: [{ id: 1 }], sessionId: id, canRefine: false, session },
    { type: 'no_result', answer: 'Chưa có kết quả.', recommendations: [], sessionId: id, terminal: true, session }
  ];
  for (const result of cases) {
    const response = await request(createChatWithAdvisor({ processConversation: async () => result }), { message: 'sofa' });
    assert.equal(response.status, 200); assert.deepEqual(response.body, result);
  }
});
