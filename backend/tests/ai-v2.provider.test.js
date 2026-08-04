import assert from 'node:assert/strict';
import test from 'node:test';
import { callAiProvider } from '../services/ai/aiProvider.service.js';

const config = Object.freeze({
  apiKey: 'test-api-key-not-a-secret',
  model: 'gemini-test-model',
  timeoutMs: 15_000
});

const prompt = 'Return JSON only.';
const allowedCandidateIds = [2, 7];

const successText = JSON.stringify({
  answer: '  Gợi ý phù hợp  ',
  recommendations: [
    { id: 7, reason: '  Phù hợp nhu cầu  ' },
    { id: 2, reason: 'Có sẵn để tham khảo' }
  ]
});

const response = ({ status = 200, body } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

const geminiBody = (text) => ({
  candidates: [{ content: { parts: [{ text }] } }]
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

test('returns validated, trimmed Gemini JSON output on the first attempt', async () => {
  let calls = 0;
  const result = await callAiProvider({
    prompt,
    allowedCandidateIds,
    config,
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.match(url, /gemini-test-model:generateContent$/);
      assert.equal(options.headers['x-goog-api-key'], config.apiKey);
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.deepEqual(JSON.parse(options.body), {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });
      assert.equal(options.signal instanceof AbortSignal, true);
      return response({ body: geminiBody(`\`\`\`json\n${successText}\n\`\`\``) });
    }
  });

  assert.equal(calls, 1);
  assert.deepEqual(result, {
    ok: true,
    data: {
      answer: 'Gợi ý phù hợp',
      recommendations: [
        { id: 7, reason: 'Phù hợp nhu cầu' },
        { id: 2, reason: 'Có sẵn để tham khảo' }
      ]
    },
    provider: { attemptCount: 1, fallbackUsed: false }
  });
});

test('accepts plain JSON text and uses the first usable Gemini text part', async () => {
  const result = await callAiProvider({
    prompt,
    allowedCandidateIds,
    config,
    fetchImpl: async () => response({
      body: {
        candidates: [{ content: { parts: [{ inlineData: { ignored: true } }, { text: successText }] } }]
      }
    })
  });
  assert.equal(result.ok, true);
  assert.equal(result.provider.attemptCount, 1);
});

test('does not call fetch when the API key, model, prompt, or allow-list contract is invalid', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({ body: geminiBody(successText) });
  };

  const noKey = await callAiProvider({ prompt, allowedCandidateIds, config: { ...config, apiKey: undefined }, fetchImpl });
  const noModel = await callAiProvider({ prompt, allowedCandidateIds, config: { ...config, model: '   ' }, fetchImpl });
  const invalidAllowList = await callAiProvider({ prompt, allowedCandidateIds: ['7'], config, fetchImpl });

  assert.equal(noKey.error.code, 'AI_PROVIDER_NO_API_KEY');
  assert.equal(noModel.error.code, 'AI_PROVIDER_CONFIG_INVALID');
  assert.equal(invalidAllowList.error.code, 'AI_PROVIDER_ID_NOT_ALLOWED');
  assert.equal(calls, 0);
  assert.equal(JSON.stringify({ noKey, noModel, invalidAllowList }).includes(config.apiKey), false);
});

test('enforces the normalized 15000-20000 millisecond timeout contract before network access', async () => {
  for (const timeoutMs of [15_000, 18_000, 20_000]) {
    let calls = 0;
    const result = await callAiProvider({
      prompt,
      allowedCandidateIds,
      config: { ...config, timeoutMs },
      fetchImpl: async () => {
        calls += 1;
        return response({ body: geminiBody(successText) });
      }
    });
    assert.equal(result.ok, true);
    assert.equal(calls, 1);
  }

  for (const timeoutMs of [undefined, 14_999, 20_001, 0, -1, 18_000.5, '18000', Number.NaN, Number.POSITIVE_INFINITY]) {
    let calls = 0;
    const result = await callAiProvider({
      prompt,
      allowedCandidateIds,
      config: { ...config, timeoutMs },
      fetchImpl: async () => {
        calls += 1;
        return response({ body: geminiBody(successText) });
      }
    });
    assert.deepEqual(result, {
      ok: false,
      error: { code: 'AI_PROVIDER_CONFIG_INVALID', retryable: false },
      provider: { attemptCount: 0, fallbackUsed: true }
    });
    assert.equal(calls, 0);
    assert.equal(JSON.stringify(result).includes('18000.5'), false);
  }
});

test('retries exactly once for transient network and provider HTTP failures', async () => {
  let networkCalls = 0;
  const recovered = await callAiProvider({
    prompt,
    allowedCandidateIds,
    config,
    fetchImpl: async () => {
      networkCalls += 1;
      if (networkCalls === 1) throw new Error('network unavailable');
      return response({ body: geminiBody(successText) });
    }
  });
  assert.equal(networkCalls, 2);
  assert.equal(recovered.ok, true);
  assert.equal(recovered.provider.attemptCount, 2);

  for (const status of [429, 500, 503]) {
    let calls = 0;
    const failed = await callAiProvider({
      prompt,
      allowedCandidateIds,
      config,
      fetchImpl: async () => {
        calls += 1;
        return response({ status, body: { error: { message: 'raw provider body' } } });
      }
    });
    assert.equal(calls, 2);
    assert.equal(failed.ok, false);
    assert.equal(failed.provider.attemptCount, 2);
    assert.equal(failed.error.retryable, true);
    assert.equal(failed.error.code, status === 429 ? 'AI_PROVIDER_RATE_LIMITED' : 'AI_PROVIDER_UPSTREAM_ERROR');
    assert.equal(JSON.stringify(failed).includes('raw provider body'), false);
  }
});

test('does not retry non-transient HTTP responses and never exceeds two attempts', async () => {
  for (const status of [400, 401, 403, 404]) {
    let calls = 0;
    const result = await callAiProvider({
      prompt,
      allowedCandidateIds,
      config,
      fetchImpl: async () => {
        calls += 1;
        return response({ status, body: { error: { message: 'must remain private' } } });
      }
    });
    assert.equal(calls, 1);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, [401, 403].includes(status) ? 'AI_PROVIDER_AUTH_ERROR' : 'AI_PROVIDER_UNKNOWN_ERROR');
    assert.equal(result.error.retryable, false);
    assert.equal(result.provider.attemptCount, 1);
  }

  let calls = 0;
  const result = await callAiProvider({
    prompt,
    allowedCandidateIds,
    config,
    fetchImpl: async () => {
      calls += 1;
      throw new Error('still down');
    }
  });
  assert.equal(calls, 2);
  assert.equal(result.error.code, 'AI_PROVIDER_NETWORK_ERROR');
});

test('classifies DNS and TLS transport failures without exposing error details', async () => {
  for (const [code, expected] of [['ENOTFOUND', 'AI_PROVIDER_DNS_ERROR'], ['ERR_TLS_CERT_ALTNAME_INVALID', 'AI_PROVIDER_TLS_ERROR']]) {
    let calls = 0;
    const result = await callAiProvider({
      prompt,
      allowedCandidateIds,
      config: { ...config, maxAttempts: 1 },
      fetchImpl: async () => {
        calls += 1;
        const error = new Error('private transport detail');
        error.code = code;
        throw error;
      }
    });
    assert.equal(calls, 1);
    assert.equal(result.error.code, expected);
    assert.equal(JSON.stringify(result).includes('private transport detail'), false);
  }
});

test('aborts each timed-out attempt, clears timers, and then falls back after the second timeout', async () => {
  let calls = 0;
  const cleared = [];
  const result = await callAiProvider({
    prompt,
    allowedCandidateIds,
    config,
    fetchImpl: async (_url, options) => {
      calls += 1;
      assert.equal(options.signal.aborted, true);
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    },
    setTimeoutImpl: (callback) => {
      callback();
      return { timeout: true };
    },
    clearTimeoutImpl: (timer) => cleared.push(timer)
  });
  assert.equal(calls, 2);
  assert.equal(cleared.length, 2);
  assert.equal(result.ok, false);
  assert.deepEqual(result.error, { code: 'AI_PROVIDER_TIMEOUT', retryable: true });
  assert.deepEqual(result.provider, { attemptCount: 2, fallbackUsed: true });
});

test('keeps the deadline through stalled body reads, retries once, and leaves no late rejection', async () => {
  const timerCallbacks = [];
  const cleared = [];
  const signals = [];
  const firstBodyStarted = deferred();
  const secondBodyStarted = deferred();
  const firstBody = deferred();
  const secondBody = deferred();
  let calls = 0;
  let unhandled;
  const onUnhandledRejection = (reason) => {
    unhandled = reason;
  };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    const execution = callAiProvider({
      prompt,
      allowedCandidateIds,
      config,
      fetchImpl: async (_url, options) => {
        calls += 1;
        signals.push(options.signal);
        const body = calls === 1 ? firstBody : secondBody;
        const started = calls === 1 ? firstBodyStarted : secondBodyStarted;
        return {
          ok: true,
          status: 200,
          json: async () => {
            started.resolve();
            return body.promise;
          }
        };
      },
      setTimeoutImpl: (callback) => {
        timerCallbacks.push(callback);
        return { index: timerCallbacks.length - 1 };
      },
      clearTimeoutImpl: (timer) => cleared.push(timer.index)
    });

    await firstBodyStarted.promise;
    timerCallbacks[0]();
    await secondBodyStarted.promise;
    timerCallbacks[1]();
    const result = await execution;

    assert.equal(calls, 2);
    assert.notEqual(signals[0], signals[1]);
    assert.equal(signals[0].aborted, true);
    assert.equal(signals[1].aborted, true);
    assert.deepEqual(cleared, [0, 1]);
    assert.deepEqual(result, {
      ok: false,
      error: { code: 'AI_PROVIDER_TIMEOUT', retryable: true },
      provider: { attemptCount: 2, fallbackUsed: true }
    });

    firstBody.reject(new Error('late first body rejection'));
    secondBody.resolve(geminiBody(successText));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(unhandled, undefined);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

test('retries a timed-out body once and accepts a fully read second response', async () => {
  const timerCallbacks = [];
  const signals = [];
  const firstBodyStarted = deferred();
  const stalledBody = deferred();
  let calls = 0;
  const resultPromise = callAiProvider({
    prompt,
    allowedCandidateIds,
    config,
    fetchImpl: async (_url, options) => {
      calls += 1;
      signals.push(options.signal);
      if (calls === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => {
            firstBodyStarted.resolve();
            return stalledBody.promise;
          }
        };
      }
      return response({ body: geminiBody(successText) });
    },
    setTimeoutImpl: (callback) => {
      timerCallbacks.push(callback);
      return { index: timerCallbacks.length - 1 };
    },
    clearTimeoutImpl: () => {}
  });

  await firstBodyStarted.promise;
  timerCallbacks[0]();
  const result = await resultPromise;
  stalledBody.resolve(geminiBody(successText));

  assert.equal(calls, 2);
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
  assert.equal(result.ok, true);
  assert.equal(result.provider.attemptCount, 2);
  assert.deepEqual(result.data.recommendations.map((item) => item.id), [7, 2]);
});

test('fails closed without retry for malformed, invalid, or disallowed provider output', async () => {
  const cases = [
    { body: {}, code: 'AI_PROVIDER_RESPONSE_EMPTY' },
    { body: geminiBody('not JSON'), code: 'AI_PROVIDER_INVALID_RESPONSE' },
    { body: geminiBody(JSON.stringify({ answer: 'x', recommendations: [], extra: true })), code: 'AI_PROVIDER_OUTPUT_INVALID' },
    { body: geminiBody(JSON.stringify({ answer: 'x', recommendations: Array.from({ length: 6 }, (_, index) => ({ id: index + 1, reason: 'valid' })) })), code: 'AI_PROVIDER_OUTPUT_INVALID' },
    { body: geminiBody(JSON.stringify({ answer: 'x', recommendations: [{ id: 7, reason: 'a' }, { id: 7, reason: 'b' }] })), code: 'AI_PROVIDER_OUTPUT_INVALID' },
    { body: geminiBody(JSON.stringify({ answer: 'x', recommendations: [{ id: '7', reason: 'a' }] })), code: 'AI_PROVIDER_OUTPUT_INVALID' },
    { body: geminiBody(JSON.stringify({ answer: '', recommendations: [] })), code: 'AI_PROVIDER_OUTPUT_INVALID' },
    { body: geminiBody(JSON.stringify({ answer: 'x', recommendations: [{ id: 7, reason: 'a', price: 1 }] })), code: 'AI_PROVIDER_OUTPUT_INVALID' },
    { body: geminiBody(JSON.stringify({ answer: 'x', recommendations: [{ id: 7, reason: '' }] })), code: 'AI_PROVIDER_OUTPUT_INVALID' },
    { body: geminiBody(JSON.stringify({ answer: 'x', recommendations: [{ id: 999, reason: 'not allowed' }] })), code: 'AI_PROVIDER_ID_NOT_ALLOWED' }
  ];

  for (const scenario of cases) {
    let calls = 0;
    const result = await callAiProvider({
      prompt,
      allowedCandidateIds,
      config,
      fetchImpl: async () => {
        calls += 1;
        return response({ body: scenario.body });
      }
    });
    assert.equal(calls, 1);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, scenario.code);
    assert.equal(result.error.retryable, false);
  }
});

test('does not mutate prompt or allow-list and never serializes private provider inputs in errors', async () => {
  const sourceAllowedIds = [2, 7];
  const sourcePrompt = `${prompt} secret-user-message`;
  const rawBody = 'provider-body-should-not-leak';
  const result = await callAiProvider({
    prompt: sourcePrompt,
    allowedCandidateIds: sourceAllowedIds,
    config,
    fetchImpl: async () => response({ status: 500, body: rawBody })
  });
  assert.deepEqual(sourceAllowedIds, [2, 7]);
  assert.equal(sourcePrompt, 'Return JSON only. secret-user-message');
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('secret-user-message'), false);
  assert.equal(serialized.includes(config.apiKey), false);
  assert.equal(serialized.includes(rawBody), false);
});
