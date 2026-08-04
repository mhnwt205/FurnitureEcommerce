import assert from 'node:assert/strict';
import test from 'node:test';
import { processAiChat } from '../services/ai/aiChat.service.js';
import { AI_ERROR_CODE, AiContractError } from '../services/ai/aiContracts.js';

const parsedRequest = Object.freeze({ message: 'Tìm sofa', context: undefined });
const config = Object.freeze({ apiKey: 'key', model: 'model', timeoutMs: 18000, maxCandidates: 20, issues: [] });
const candidates = [{ id: 1, name: 'Sofa', slug: 'sofa', image: null, price: 100, finalPrice: 90, promotionSummary: null, stock: 2, category: { name: 'Sofa', slug: 'sofa' }, averageRating: 0, reviewCount: 0 }];

const makeDependencies = (overrides = {}) => {
  const calls = { parse: 0, config: 0, resolver: 0, retrieval: 0, prompt: 0, provider: 0, rebuild: 0, fallback: 0, noResult: 0 };
  return {
    calls,
    dependencies: {
      parseAiChatRequest: (input) => { calls.parse += 1; return parsedRequest; },
      getAiConfig: () => { calls.config += 1; return config; },
      resolveAiConversationState: async () => { calls.resolver += 1; return { ok: true, transition: { operation: 'refine', clear: [], set: {} }, provider: { attemptCount: 1 } }; },
      retrieveAiCandidates: async () => { calls.retrieval += 1; return { candidates, metadata: { primaryCount: 1, fallbackUsed: false, fallbackReason: 'NONE', retrievedCount: 1 } }; },
      buildAiRecommendationPrompt: () => { calls.prompt += 1; return { prompt: 'prompt', allowedCandidateIds: [1] }; },
      callAiProvider: async () => { calls.provider += 1; return { ok: true, data: { answer: 'AI', recommendations: [{ id: 1, reason: 'AI reason' }] }, provider: { attemptCount: 1, fallbackUsed: false } }; },
      rebuildAiProviderResponse: ({ providerResult }) => { calls.rebuild += 1; return { answer: providerResult.answer, recommendations: [{ ...candidates[0], promotion: null, reason: providerResult.recommendations[0].reason }] }; },
      buildDeterministicAiFallback: () => { calls.fallback += 1; return { answer: 'Fallback', recommendations: [] }; },
      buildAiNoResultResponse: () => { calls.noResult += 1; return { answer: 'No result', recommendations: [] }; },
      ...overrides
    }
  };
};

test('orchestrates parse/config/retrieval/prompt/provider/rebuild exactly once for provider success', async () => {
  const { calls, dependencies } = makeDependencies();
  const result = await processAiChat({ message: 'Tìm sofa' }, dependencies);
  assert.deepEqual(calls, { parse: 1, config: 1, resolver: 1, retrieval: 1, prompt: 1, provider: 1, rebuild: 1, fallback: 0, noResult: 0 });
  assert.deepEqual(Object.keys(result.response), ['answer', 'recommendations']);
  assert.deepEqual(result.internal, { providerFallbackUsed: false, providerFailureCode: null, resolverFallbackUsed: false, staleBudgetCleared: false, source: 'provider' });
});

test('uses backend fallback exactly once for provider failure without refetching', async () => {
  let providerCalls = 0;
  const { calls, dependencies } = makeDependencies({ callAiProvider: async () => {
    providerCalls += 1;
    return { ok: false, error: { code: 'AI_PROVIDER_HTTP_ERROR', status: 403 }, provider: { attemptCount: 2, fallbackUsed: true } };
  } });
  const result = await processAiChat({ message: 'Tìm sofa' }, dependencies);
  assert.deepEqual(calls, { parse: 1, config: 1, resolver: 1, retrieval: 1, prompt: 1, provider: 0, rebuild: 0, fallback: 1, noResult: 0 });
  assert.equal(providerCalls, 1);
  assert.deepEqual(result.internal, { providerFallbackUsed: true, providerFailureCode: 'AI_PROVIDER_HTTP_ERROR', providerFailureStatus: 403, resolverFallbackUsed: false, staleBudgetCleared: false, source: 'fallback' });
});

test('returns deterministic no-result without prompt or provider when retrieval is empty and propagates retrieval errors', async () => {
  const empty = makeDependencies({ retrieveAiCandidates: async () => { empty.calls.retrieval += 1; return { candidates: [], metadata: { primaryCount: 0, fallbackUsed: false, fallbackReason: 'NONE', retrievedCount: 0 } }; } });
  const result = await processAiChat({ message: 'Tìm sofa' }, empty.dependencies);
  assert.deepEqual(empty.calls, { parse: 1, config: 1, resolver: 1, retrieval: 1, prompt: 0, provider: 0, rebuild: 0, fallback: 0, noResult: 1 });
  assert.deepEqual(result.response, { answer: 'No result', recommendations: [] });

  const failure = makeDependencies({ retrieveAiCandidates: async () => { throw Object.assign(new Error('database unavailable'), { status: 503 }); } });
  await assert.rejects(() => processAiChat({ message: 'Tìm sofa' }, failure.dependencies), /database unavailable/);
  assert.equal(failure.calls.provider, 0);
});

test('short-circuits provider, fallback, and no-result when the prompt builder throws an internal prompt error', async () => {
  const input = Object.freeze({ message: 'Tim sofa' });
  const candidateSnapshot = Object.freeze(candidates.map((candidate) => Object.freeze({ ...candidate, category: Object.freeze({ ...candidate.category }) })));
  const promptError = new AiContractError(AI_ERROR_CODE.promptBuild, 'prompt-secret-test candidate-description-test');
  const { calls, dependencies } = makeDependencies({
    retrieveAiCandidates: async () => { calls.retrieval += 1; return { candidates: candidateSnapshot, metadata: { primaryCount: 1, fallbackUsed: false, fallbackReason: 'NONE', retrievedCount: 1 } }; },
    buildAiRecommendationPrompt: () => { calls.prompt += 1; throw promptError; }
  });

  await assert.rejects(() => processAiChat(input, dependencies), (error) => error === promptError && error.code === AI_ERROR_CODE.promptBuild);
  assert.deepEqual(calls, { parse: 1, config: 1, resolver: 1, retrieval: 1, prompt: 1, provider: 0, rebuild: 0, fallback: 0, noResult: 0 });
  assert.deepEqual(input, { message: 'Tim sofa' });
  assert.deepEqual(candidateSnapshot, candidates);
});

test('propagates unexpected prompt builder errors without calling provider or fabricating a response', async () => {
  const promptError = new Error('prompt-secret-test candidate-description-test');
  const { calls, dependencies } = makeDependencies({
    buildAiRecommendationPrompt: () => { calls.prompt += 1; throw promptError; }
  });

  await assert.rejects(() => processAiChat({ message: 'Tim sofa' }, dependencies), (error) => error === promptError);
  assert.deepEqual(calls, { parse: 1, config: 1, resolver: 1, retrieval: 1, prompt: 1, provider: 0, rebuild: 0, fallback: 0, noResult: 0 });
});
