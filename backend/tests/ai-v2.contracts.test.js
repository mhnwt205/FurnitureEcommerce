import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_ANSWER_MAX_LENGTH,
  AI_DEFAULT_MAX_CANDIDATES,
  AI_DEFAULT_RATE_LIMIT_MAX,
  AI_DEFAULT_RATE_LIMIT_WINDOW_MS,
  AI_DEFAULT_TIMEOUT_MS,
  AI_KNOWLEDGE_VERSION,
  AI_OUTPUT_CONTRACT_VERSION,
  AI_PROMPT_VERSION,
  AI_TOTAL_PROMPT_MAX_CHARS,
  AI_HARD_MAX_CANDIDATES,
  AI_MAX_RECOMMENDATIONS,
  AI_MESSAGE_MAX_LENGTH,
  AI_REASON_MAX_LENGTH,
  AiContractError
} from '../services/ai/aiContracts.js';
import { getAiConfig } from '../services/ai/aiConfig.js';
import {
  parseAiChatRequest,
  parseAiProviderResponse,
  validateRecommendationAllowList
} from '../services/ai/aiValidation.js';

const expectCode = (callback, code) => {
  assert.throws(callback, (error) => error instanceof AiContractError && error.code === code);
};

const expectContractError = (callback, code, message) => {
  assert.throws(callback, (error) => (
    error instanceof AiContractError
    && error.code === code
    && error.message === message
  ));
};

test('AI v2 shared constants are frozen specification values', () => {
  assert.equal(AI_DEFAULT_MAX_CANDIDATES, 20);
  assert.equal(AI_HARD_MAX_CANDIDATES, 30);
  assert.equal(AI_MAX_RECOMMENDATIONS, 5);
  assert.equal(AI_PROMPT_VERSION, 'AI_ADVISOR_V2');
  assert.equal(AI_KNOWLEDGE_VERSION, 'HK_V1');
  assert.equal(AI_OUTPUT_CONTRACT_VERSION, '1');
  assert.equal(AI_TOTAL_PROMPT_MAX_CHARS, 40000);
  assert.equal(AI_DEFAULT_TIMEOUT_MS, 18000);
  assert.equal(AI_DEFAULT_RATE_LIMIT_MAX, 20);
  assert.equal(AI_DEFAULT_RATE_LIMIT_WINDOW_MS, 300000);
  assert.equal(AI_MESSAGE_MAX_LENGTH, 1000);
  assert.equal(AI_ANSWER_MAX_LENGTH, 500);
  assert.equal(AI_REASON_MAX_LENGTH, 240);
});

test('request contract accepts and normalizes a 1000-character message without mutation', () => {
  const input = { message: `  ${'x'.repeat(AI_MESSAGE_MAX_LENGTH)}  ` };
  const parsed = parseAiChatRequest(input);
  assert.deepEqual(parsed, { message: 'x'.repeat(AI_MESSAGE_MAX_LENGTH) });
  assert.deepEqual(input, { message: `  ${'x'.repeat(AI_MESSAGE_MAX_LENGTH)}  ` });
});

test('request contract accepts currentProductId 1 and rejects non-integer Product IDs', () => {
  assert.deepEqual(parseAiChatRequest({ message: 'chair', context: { currentProductId: 1 } }), {
    message: 'chair', context: { currentProductId: 1 }
  });
  for (const currentProductId of ['1', 0, -1, 1.5, Number.NaN]) {
    expectCode(
      () => parseAiChatRequest({ message: 'chair', context: { currentProductId } }),
      'AI_REQUEST_VALIDATION_ERROR'
    );
  }
});

test('request contract rejects 1001 characters, unknown keys, and client authority fields', () => {
  expectCode(() => parseAiChatRequest({ message: '   ' }), 'AI_REQUEST_VALIDATION_ERROR');
  expectCode(() => parseAiChatRequest({ message: 'x'.repeat(AI_MESSAGE_MAX_LENGTH + 1) }), 'AI_REQUEST_VALIDATION_ERROR');
  expectCode(() => parseAiChatRequest({ message: 'chair', unknown: true }), 'AI_REQUEST_VALIDATION_ERROR');
  expectCode(() => parseAiChatRequest({ message: 'chair', context: { currentProductId: 1, other: true } }), 'AI_REQUEST_VALIDATION_ERROR');
  for (const forbidden of [
    { sessionId: 'session' },
    { history: [] },
    { clientMessageId: 'message' },
    { resetSession: true },
    { provider: { model: 'untrusted' } },
    { candidates: [1] }
  ]) {
    expectCode(() => parseAiChatRequest({ message: 'chair', ...forbidden }), 'AI_REQUEST_VALIDATION_ERROR');
  }
});

test('request validation errors do not expose the raw message', () => {
  const secretMessage = 'message-that-must-not-appear';
  assert.throws(
    () => parseAiChatRequest({ message: secretMessage, unexpected: true }),
    (error) => error instanceof AiContractError
      && error.code === 'AI_REQUEST_VALIDATION_ERROR'
      && !error.message.includes(secretMessage)
  );
});

test('provider output accepts exact answer/reason bounds, five recommendations, and preserves input', () => {
  const input = {
    answer: `  ${'a'.repeat(AI_ANSWER_MAX_LENGTH)}  `,
    recommendations: Array.from({ length: AI_MAX_RECOMMENDATIONS }, (_, index) => ({
      id: index + 1,
      reason: index === 0 ? `  ${'r'.repeat(AI_REASON_MAX_LENGTH)}  ` : 'valid reason'
    }))
  };
  const parsed = parseAiProviderResponse(input);
  assert.equal(parsed.answer.length, AI_ANSWER_MAX_LENGTH);
  assert.equal(parsed.recommendations.length, AI_MAX_RECOMMENDATIONS);
  assert.equal(parsed.recommendations[0].reason.length, AI_REASON_MAX_LENGTH);
  assert.equal(input.answer, `  ${'a'.repeat(AI_ANSWER_MAX_LENGTH)}  `);
  assert.equal(input.recommendations[0].reason, `  ${'r'.repeat(AI_REASON_MAX_LENGTH)}  `);
  assert.deepEqual(parseAiProviderResponse({ answer: 'need more detail', recommendations: [] }).recommendations, []);
});

test('provider output rejects every invalid item with the provider-output error code', () => {
  const invalidPayloads = [
    { answer: '   ', recommendations: [] },
    { answer: 'a'.repeat(AI_ANSWER_MAX_LENGTH + 1), recommendations: [] },
    { answer: 'ok', recommendations: Array.from({ length: 6 }, (_, index) => ({ id: index + 1, reason: 'valid' })) },
    { answer: 'ok', recommendations: [{ id: 1, reason: 'first' }, { id: 1, reason: 'duplicate' }] },
    { answer: 'ok', recommendations: [{ id: 1, reason: '   ' }] },
    { answer: 'ok', recommendations: [{ id: 1, reason: 'r'.repeat(AI_REASON_MAX_LENGTH + 1) }] },
    { answer: 'ok', recommendations: [{ id: '1', reason: 'valid' }] },
    { answer: 'ok', recommendations: [{ id: 1.5, reason: 'valid' }] },
    { answer: 'ok', recommendations: [{ id: -1, reason: 'valid' }] },
    { answer: 'ok', recommendations: [{ id: 1, reason: 'valid', price: 10 }] },
    { answer: 'ok', recommendations: [{ id: 1, reason: 'valid', unknown: true }] },
    { answer: 'ok', recommendations: [], providerMetadata: {} }
  ];
  for (const payload of invalidPayloads) {
    expectCode(() => parseAiProviderResponse(payload), 'AI_PROVIDER_OUTPUT_INVALID');
  }
});

test('provider validation errors do not expose the raw provider response', () => {
  const rawProviderText = 'provider-body-that-must-not-appear';
  assert.throws(
    () => parseAiProviderResponse({ answer: rawProviderText, recommendations: [], unexpected: true }),
    (error) => error instanceof AiContractError
      && error.code === 'AI_PROVIDER_OUTPUT_INVALID'
      && !error.message.includes(rawProviderText)
  );
});

test('allow-list validation preserves provider order and does not mutate result or array input', () => {
  const providerResult = {
    answer: 'choices',
    recommendations: [{ id: 9, reason: 'reason 9' }, { id: 7, reason: 'reason 7' }]
  };
  const allowedIds = [7, 9, 12];
  const validated = validateRecommendationAllowList(providerResult, allowedIds);
  assert.deepEqual(validated.recommendations.map((item) => item.id), [9, 7]);
  assert.deepEqual(providerResult.recommendations.map((item) => item.id), [9, 7]);
  assert.deepEqual(allowedIds, [7, 9, 12]);
  assert.deepEqual(validateRecommendationAllowList({ answer: 'empty', recommendations: [] }, []).recommendations, []);
});

test('allow-list validation fails closed for external provider IDs', () => {
  expectCode(
    () => validateRecommendationAllowList({ answer: 'ok', recommendations: [{ id: 8, reason: 'valid' }] }, [7]),
    'AI_PROVIDER_ID_NOT_ALLOWED'
  );
  expectCode(
    () => validateRecommendationAllowList({ answer: 'ok', recommendations: [{ id: 1, reason: 'valid' }] }, ['1']),
    'AI_PROVIDER_ID_NOT_ALLOWED'
  );
});

test('allow-list validation accepts only arrays of unique positive integer IDs', () => {
  const providerResult = { answer: 'ok', recommendations: [{ id: 1, reason: 'valid' }] };
  for (const invalidAllowedIds of [new Set([1]), { 0: 1, length: 1 }, ['1'], [0], [-1], [1.5], [Number.NaN], [1, 1]]) {
    expectContractError(
      () => validateRecommendationAllowList(providerResult, invalidAllowedIds),
      'AI_PROVIDER_ID_NOT_ALLOWED',
      'AI candidate allow-list is invalid'
    );
  }
});

test('AI config uses defaults, accepts valid values, and keeps the API key optional', () => {
  const defaults = getAiConfig({});
  assert.equal(defaults.timeoutMs, AI_DEFAULT_TIMEOUT_MS);
  assert.equal(defaults.maxCandidates, AI_DEFAULT_MAX_CANDIDATES);
  assert.equal(defaults.rateLimitMax, AI_DEFAULT_RATE_LIMIT_MAX);
  assert.equal(defaults.rateLimitWindowMs, AI_DEFAULT_RATE_LIMIT_WINDOW_MS);
  assert.equal(defaults.apiKey, undefined);
  assert.deepEqual(defaults.issues, []);

  const configured = getAiConfig({
    GEMINI_API_KEY: '  never-log-this-secret  ',
    AI_MODEL: '  gemini-test  ',
    AI_TIMEOUT_MS: '15000',
    AI_MAX_CANDIDATES: '1',
    AI_RATE_LIMIT_MAX: '25',
    AI_RATE_LIMIT_WINDOW_MS: '600000'
  });
  assert.equal(configured.apiKey, 'never-log-this-secret');
  assert.equal(configured.model, 'gemini-test');
  assert.equal(configured.timeoutMs, 15000);
  assert.equal(configured.maxCandidates, 1);
  assert.equal(configured.rateLimitMax, 25);
  assert.equal(configured.rateLimitWindowMs, 600000);
  assert.deepEqual(configured.issues, []);

  const upperBoundary = getAiConfig({ AI_TIMEOUT_MS: '20000', AI_MAX_CANDIDATES: '30' });
  assert.equal(upperBoundary.timeoutMs, 20000);
  assert.equal(upperBoundary.maxCandidates, 30);
});

test('AI config uses exact safe defaults and sanitized issues for malformed numeric values', () => {
  const fallbackCases = [
    ['AI_MAX_CANDIDATES', '   ', 'maxCandidates', AI_DEFAULT_MAX_CANDIDATES],
    ['AI_MAX_CANDIDATES', '20.5', 'maxCandidates', AI_DEFAULT_MAX_CANDIDATES],
    ['AI_MAX_CANDIDATES', '2e1', 'maxCandidates', AI_DEFAULT_MAX_CANDIDATES],
    ['AI_MAX_CANDIDATES', '0', 'maxCandidates', AI_DEFAULT_MAX_CANDIDATES],
    ['AI_MAX_CANDIDATES', '-1', 'maxCandidates', AI_DEFAULT_MAX_CANDIDATES],
    ['AI_MAX_CANDIDATES', 'NaN', 'maxCandidates', AI_DEFAULT_MAX_CANDIDATES],
    ['AI_MAX_CANDIDATES', 'Infinity', 'maxCandidates', AI_DEFAULT_MAX_CANDIDATES],
    ['AI_MAX_CANDIDATES', '31', 'maxCandidates', AI_DEFAULT_MAX_CANDIDATES],
    ['AI_TIMEOUT_MS', '14999', 'timeoutMs', AI_DEFAULT_TIMEOUT_MS],
    ['AI_TIMEOUT_MS', '20001', 'timeoutMs', AI_DEFAULT_TIMEOUT_MS],
    ['AI_RATE_LIMIT_MAX', '0', 'rateLimitMax', AI_DEFAULT_RATE_LIMIT_MAX],
    ['AI_RATE_LIMIT_MAX', '-1', 'rateLimitMax', AI_DEFAULT_RATE_LIMIT_MAX],
    ['AI_RATE_LIMIT_MAX', '20.5', 'rateLimitMax', AI_DEFAULT_RATE_LIMIT_MAX],
    ['AI_RATE_LIMIT_MAX', '2e1', 'rateLimitMax', AI_DEFAULT_RATE_LIMIT_MAX],
    ['AI_RATE_LIMIT_MAX', '1001', 'rateLimitMax', AI_DEFAULT_RATE_LIMIT_MAX],
    ['AI_RATE_LIMIT_WINDOW_MS', '0', 'rateLimitWindowMs', AI_DEFAULT_RATE_LIMIT_WINDOW_MS],
    ['AI_RATE_LIMIT_WINDOW_MS', '999', 'rateLimitWindowMs', AI_DEFAULT_RATE_LIMIT_WINDOW_MS],
    ['AI_RATE_LIMIT_WINDOW_MS', '3600001', 'rateLimitWindowMs', AI_DEFAULT_RATE_LIMIT_WINDOW_MS]
  ];
  for (const [field, value, configField, fallback] of fallbackCases) {
    const result = getAiConfig({ GEMINI_API_KEY: 'never-log-this-secret', [field]: value });
    assert.equal(result[configField], fallback);
    assert.deepEqual(result.issues, [{ code: 'AI_CONFIG_INVALID', field }]);
    assert.equal(JSON.stringify(result.issues).includes('never-log-this-secret'), false);
  }
});
