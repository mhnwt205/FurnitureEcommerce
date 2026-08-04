import { getAiConfig } from './aiConfig.js';
import { buildAiRecommendationPrompt } from './aiPrompt.service.js';
import { callAiProvider } from './aiProvider.service.js';
import { retrieveAiCandidates } from './aiProductSearch.service.js';
import { buildAiNoResultResponse, buildDeterministicAiFallback, rebuildAiProviderResponse } from './aiResponse.service.js';
import { parseAiChatRequest } from './aiValidation.js';
import { createInMemoryAiConversationStore, applyAiStateTransition, buildSafeAiResolverFallback } from './aiConversation.service.js';
import { AI_CONSTANTS } from './aiContracts.js';
import { resolveAiConversationState } from './aiStateResolver.service.js';
import { AiOverallDeadlineExceeded, createAiRequestDeadline } from './aiDeadline.service.js';

const defaultConversationStores = new Map();
const getDefaultConversationStore = (config) => {
  const options = {
    ttlMs: config.conversationTtlMs ?? AI_CONSTANTS.defaultConversationTtlMs,
    maxEntries: config.conversationMaxEntries ?? AI_CONSTANTS.defaultConversationMaxEntries,
    maxRecentTurns: config.conversationMaxRecentTurns ?? AI_CONSTANTS.defaultConversationMaxRecentTurns,
    maxTotalChars: config.conversationMaxTotalChars ?? AI_CONSTANTS.defaultConversationMaxTotalChars,
    maxTurnChars: config.conversationMaxTurnChars ?? AI_CONSTANTS.defaultConversationMaxTurnChars
  };
  const key = JSON.stringify(options);
  if (!defaultConversationStores.has(key)) defaultConversationStores.set(key, createInMemoryAiConversationStore(options));
  return defaultConversationStores.get(key);
};
const defaultDependencies = Object.freeze({ getAiConfig, parseAiChatRequest, retrieveAiCandidates, buildAiRecommendationPrompt, callAiProvider, rebuildAiProviderResponse, buildDeterministicAiFallback, buildAiNoResultResponse, getDefaultConversationStore, resolveAiConversationState, applyAiStateTransition, buildSafeAiResolverFallback, createAiRequestDeadline });
const withConversation = (response, internal, conversationId) => ({ response, internal: Object.defineProperty(internal, 'conversationId', { value: conversationId, enumerable: false }) });
const conversationQueues = new Map();
const runConversationExclusive = async (conversationId, work) => {
  const previous = conversationQueues.get(conversationId) ?? Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  const chain = previous.then(() => current);
  conversationQueues.set(conversationId, chain);
  await previous;
  try { return await work(); } finally {
    release();
    if (conversationQueues.get(conversationId) === chain) conversationQueues.delete(conversationId);
  }
};

export const processAiChat = async (input, options = {}) => {
  const dependencies = options.dependencies ?? options;
  const services = { ...defaultDependencies, ...dependencies };
  const request = services.parseAiChatRequest(input);
  const config = services.getAiConfig();
  const emit = typeof options.onTelemetry === 'function' ? options.onTelemetry : () => {};
  const conversationStore = services.conversationStore ?? services.getDefaultConversationStore(config);
  const requestedId = options.conversationId;
  let conversation = requestedId ? conversationStore.get(requestedId) : null;
  if (!conversation) conversation = conversationStore.create();
  return runConversationExclusive(conversation.conversationId, async () => {
  // Reload under the per-conversation queue so concurrent requests cannot apply
  // transitions from an obsolete in-memory snapshot.
  conversation = conversationStore.get(conversation.conversationId) ?? conversation;
  const deadline = services.createAiRequestDeadline({ timeoutMs: config.requestTotalTimeoutMs ?? AI_CONSTANTS.defaultRequestTotalTimeoutMs });
  let effectiveProfile;
  let resolverFallbackUsed = false;
  let staleBudgetCleared = false;
  try {
    const resolverStartedAt = Date.now();
    emit('state_resolver_started', { timeoutMs: config.stateResolverTimeoutMs ?? AI_CONSTANTS.defaultStateResolverTimeoutMs });
    const resolverResult = await deadline.run(() => services.resolveAiConversationState({
      profile: conversation.profile,
      message: request.message,
      config: { ...config, stateResolverTimeoutMs: deadline.capTimeout(config.stateResolverTimeoutMs ?? AI_CONSTANTS.defaultStateResolverTimeoutMs), stateResolverMaxAttempts: 1 },
      callProvider: services.callAiProvider,
      onTelemetry: (event, metadata) => emit(event, { ...metadata, providerRole: 'state_resolver' })
    }));
    if (!resolverResult.ok) throw Object.assign(new Error('Resolver failed'), { code: resolverResult.error?.code });
    effectiveProfile = services.applyAiStateTransition(conversation.profile, resolverResult.transition);
    emit('state_resolver_succeeded', { durationMs: Math.max(0, Date.now() - resolverStartedAt), transitionOperation: resolverResult.transition.operation });
  } catch (_error) {
    resolverFallbackUsed = true;
    emit(_error instanceof AiOverallDeadlineExceeded ? 'state_resolver_timeout' : 'state_resolver_failed', { failureCode: _error?.code ?? 'AI_STATE_RESOLVER_UNAVAILABLE' });
    const fallback = services.buildSafeAiResolverFallback(conversation.profile, request.message);
    if (!fallback.safe) {
      conversation = conversationStore.update(conversation.conversationId, (state) => ({ ...state, recentUserTurns: [...state.recentUserTurns, request.message] })) ?? conversation;
      return withConversation(services.buildAiNoResultResponse(), { providerFallbackUsed: false, providerFailureCode: 'AI_STATE_RESOLVER_UNAVAILABLE', resolverFallbackUsed: true, source: 'clarification' }, conversation.conversationId);
    }
    effectiveProfile = fallback.profile;
    staleBudgetCleared = fallback.staleBudgetCleared;
  }
  conversation = conversationStore.update(conversation.conversationId, (state) => ({ ...state, profile: effectiveProfile, recentUserTurns: [...state.recentUserTurns, request.message] })) ?? conversation;
  let retrieval;
  try {
    retrieval = await deadline.run(() => services.retrieveAiCandidates({ message: request.message, context: request.context, profile: effectiveProfile, maxCandidates: config.maxCandidates }));
  } catch (error) {
    if (error instanceof AiOverallDeadlineExceeded) return withConversation(services.buildDeterministicAiFallback({ candidates: [] }), { providerFallbackUsed: true, providerFailureCode: error.code, resolverFallbackUsed, staleBudgetCleared, source: 'fallback' }, conversation.conversationId);
    throw error;
  }
  const candidates = retrieval?.candidates;
  if (!Array.isArray(candidates)) throw new Error('AI candidate retrieval returned an invalid result');
  if (candidates.length === 0) {
    return withConversation(services.buildAiNoResultResponse(), { providerFallbackUsed: false, providerFailureCode: null, resolverFallbackUsed, staleBudgetCleared, source: 'no_result' }, conversation.conversationId);
  }

  let prompt;
  try { prompt = await deadline.run(() => services.buildAiRecommendationPrompt({ message: request.message, candidates, retrievalMetadata: retrieval.metadata, conversationProfile: effectiveProfile, recentUserTurns: conversation.recentUserTurns })); } catch (error) { throw error; }
  let providerResult;
  try {
    const advisorStartedAt = Date.now();
    providerResult = await deadline.run(() => services.callAiProvider({
      prompt: prompt.prompt,
      allowedCandidateIds: prompt.allowedCandidateIds,
      config: { ...config, timeoutMs: deadline.capTimeout(config.providerTimeoutMs ?? config.timeoutMs), maxAttempts: 2, allowShortTimeout: true },
      // A single immediate retry is reserved for Gemini's transient 503 only.
      // Timeouts, DNS/TLS failures, auth failures, and rate limits keep their
      // one-attempt policy. The shared request deadline caps the retry.
      shouldRetry: ({ code, status }) => code === 'AI_PROVIDER_UPSTREAM_ERROR' && status === 503,
      getRemainingMs: deadline.remainingMs,
      minimumRetryRemainingMs: 1_000,
      onTelemetry: (event, metadata) => emit(event, { ...metadata, providerRole: 'sales_advisor' })
    }));
    emit('sales_advisor_completed', { durationMs: Math.max(0, Date.now() - advisorStartedAt) });
  } catch (error) {
    if (!(error instanceof AiOverallDeadlineExceeded)) throw error;
    providerResult = { ok: false, error: { code: error.code }, provider: { fallbackUsed: true } };
    emit('overall_timeout', { failureCode: error.code });
  }
  if (providerResult.ok) {
    try {
      return withConversation(services.rebuildAiProviderResponse({ providerResult: providerResult.data, candidates }), { providerFallbackUsed: false, providerFailureCode: null, resolverFallbackUsed, staleBudgetCleared, source: 'provider' }, conversation.conversationId);
    } catch (_error) {
      return withConversation(services.buildDeterministicAiFallback({ candidates }), { providerFallbackUsed: true, providerFailureCode: 'AI_RESPONSE_BUILD_ERROR', resolverFallbackUsed, staleBudgetCleared, source: 'fallback' }, conversation.conversationId);
    }
  }
  return withConversation(services.buildDeterministicAiFallback({ candidates }), {
    providerFallbackUsed: true,
    providerFailureCode: providerResult.error?.code ?? 'AI_PROVIDER_UNAVAILABLE',
    ...(Number.isInteger(providerResult.error?.status) ? { providerFailureStatus: providerResult.error.status } : {}),
    resolverFallbackUsed, staleBudgetCleared, source: 'fallback'
  }, conversation.conversationId);
  });
};
