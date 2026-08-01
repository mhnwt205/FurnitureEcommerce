import assert from 'node:assert/strict';
import test from 'node:test';
import { callGemini } from '../services/ai-advisor/recommendation/advisor.service.js';

const recommendation = [{ id: 1, name: 'Sofa', finalPrice: 100 }];
const success = () => ({
  ok: true,
  json: async () => ({ candidates: [{ content: { parts: [{ text: '{"answer":"OK","recommendations":[{"id":1,"reason":"fit"}]}' }] } }] })
});

const withApiKey = async (callback) => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  try { return await callback(); } finally { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
};

test('Gemini retries one transient upstream status then returns the validated response', async () => withApiKey(async () => {
  let calls = 0;
  const result = await callGemini({ message: 'toi can sofa', recommendations: recommendation, fetchImpl: async () => (++calls === 1 ? { ok: false, status: 503 } : success()) });
  assert.equal(calls, 2);
  assert.equal(result.answer, 'OK');
}));

test('Gemini does not retry validation statuses or malformed responses', async () => withApiKey(async () => {
  let validationCalls = 0;
  await assert.rejects(() => callGemini({ message: 'toi can sofa', recommendations: recommendation, fetchImpl: async () => { validationCalls += 1; return { ok: false, status: 400 }; } }));
  assert.equal(validationCalls, 1);
  let malformedCalls = 0;
  const malformed = await callGemini({ message: 'toi can sofa', recommendations: recommendation, fetchImpl: async () => { malformedCalls += 1; return { ok: true, json: async () => ({ candidates: [] }) }; } });
  assert.equal(malformed, null);
  assert.equal(malformedCalls, 1);
}));

test('Gemini timeout errors retry once without logging the API key', async () => withApiKey(async () => {
  let calls = 0;
  const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
  const result = await callGemini({ message: 'toi can sofa', recommendations: recommendation, fetchImpl: async () => (++calls === 1 ? Promise.reject(timeout) : success()) });
  assert.equal(calls, 2);
  assert.equal(result.answer, 'OK');
}));
