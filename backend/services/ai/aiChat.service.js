import { getAiConfig } from './aiConfig.js';
import { buildAiRecommendationPrompt } from './aiPrompt.service.js';
import { callAiProvider } from './aiProvider.service.js';
import { retrieveAiCandidates } from './aiProductSearch.service.js';
import { buildAiNoResultResponse, buildDeterministicAiFallback, rebuildAiProviderResponse } from './aiResponse.service.js';
import { parseAiChatRequest } from './aiValidation.js';
import { createInMemoryAiConversationStore, extractAiCurrentTurnIntent, mergeAiConversationProfile } from './aiConversation.service.js';
import { AI_CONSTANTS } from './aiContracts.js';

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
const defaultDependencies = Object.freeze({ getAiConfig, parseAiChatRequest, retrieveAiCandidates, buildAiRecommendationPrompt, callAiProvider, rebuildAiProviderResponse, buildDeterministicAiFallback, buildAiNoResultResponse, getDefaultConversationStore, extractAiCurrentTurnIntent, mergeAiConversationProfile });
const withConversation = (response, internal, conversationId) => ({ response, internal: Object.defineProperty(internal, 'conversationId', { value: conversationId, enumerable: false }) });

export const processAiChat = async (input, options = {}) => {
  const dependencies = options.dependencies ?? options;
  const services = { ...defaultDependencies, ...dependencies };
  const request = services.parseAiChatRequest(input);
  const config = services.getAiConfig();
  const conversationStore = services.conversationStore ?? services.getDefaultConversationStore(config);
  const requestedId = options.conversationId;
  let conversation = requestedId ? conversationStore.get(requestedId) : null;
  if (!conversation) conversation = conversationStore.create();
  const currentPatch = services.extractAiCurrentTurnIntent(request.message);
  const effectiveProfile = services.mergeAiConversationProfile(conversation.profile, currentPatch);
  conversation = conversationStore.update(conversation.conversationId, (state) => ({ ...state, profile: effectiveProfile, recentUserTurns: [...state.recentUserTurns, request.message] })) ?? conversation;
  const retrieval = await services.retrieveAiCandidates({ message: request.message, context: request.context, profile: effectiveProfile, maxCandidates: config.maxCandidates });
  const candidates = retrieval?.candidates;
  if (!Array.isArray(candidates)) throw new Error('AI candidate retrieval returned an invalid result');
  if (candidates.length === 0) {
    return withConversation(services.buildAiNoResultResponse(), { providerFallbackUsed: false, providerFailureCode: null, source: 'no_result' }, conversation.conversationId);
  }

  const prompt = services.buildAiRecommendationPrompt({ message: request.message, candidates, retrievalMetadata: retrieval.metadata, conversationProfile: effectiveProfile, recentUserTurns: conversation.recentUserTurns });
  const providerResult = await services.callAiProvider({ prompt: prompt.prompt, allowedCandidateIds: prompt.allowedCandidateIds, config });
  if (providerResult.ok) {
    try {
      const providerProfile = providerResult.data.memoryPatch ? services.mergeAiConversationProfile(effectiveProfile, providerResult.data.memoryPatch) : effectiveProfile;
      conversationStore.update(conversation.conversationId, (state) => ({ ...state, profile: providerProfile }));
      return withConversation(services.rebuildAiProviderResponse({ providerResult: providerResult.data, candidates }), { providerFallbackUsed: false, providerFailureCode: null, source: 'provider' }, conversation.conversationId);
    } catch (_error) {
      return withConversation(services.buildDeterministicAiFallback({ candidates }), { providerFallbackUsed: true, providerFailureCode: 'AI_RESPONSE_BUILD_ERROR', source: 'fallback' }, conversation.conversationId);
    }
  }
  return withConversation(services.buildDeterministicAiFallback({ candidates }), { providerFallbackUsed: true, providerFailureCode: providerResult.error?.code ?? 'AI_PROVIDER_UNAVAILABLE', source: 'fallback' }, conversation.conversationId);
};
