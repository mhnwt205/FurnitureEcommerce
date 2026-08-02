import { getAiConfig } from './aiConfig.js';
import { buildAiRecommendationPrompt } from './aiPrompt.service.js';
import { callAiProvider } from './aiProvider.service.js';
import { retrieveAiCandidates } from './aiProductSearch.service.js';
import { buildAiNoResultResponse, buildDeterministicAiFallback, rebuildAiProviderResponse } from './aiResponse.service.js';
import { parseAiChatRequest } from './aiValidation.js';

const defaultDependencies = Object.freeze({ getAiConfig, parseAiChatRequest, retrieveAiCandidates, buildAiRecommendationPrompt, callAiProvider, rebuildAiProviderResponse, buildDeterministicAiFallback, buildAiNoResultResponse });

export const processAiChat = async (input, dependencies = defaultDependencies) => {
  const services = { ...defaultDependencies, ...dependencies };
  const request = services.parseAiChatRequest(input);
  const config = services.getAiConfig();
  const retrieval = await services.retrieveAiCandidates({ message: request.message, context: request.context, maxCandidates: config.maxCandidates });
  const candidates = retrieval?.candidates;
  if (!Array.isArray(candidates)) throw new Error('AI candidate retrieval returned an invalid result');
  if (candidates.length === 0) {
    return { response: services.buildAiNoResultResponse(), internal: { providerFallbackUsed: false, providerFailureCode: null, source: 'no_result' } };
  }

  const prompt = services.buildAiRecommendationPrompt({ message: request.message, candidates, retrievalMetadata: retrieval.metadata });
  const providerResult = await services.callAiProvider({ prompt: prompt.prompt, allowedCandidateIds: prompt.allowedCandidateIds, config });
  if (providerResult.ok) {
    try {
      return { response: services.rebuildAiProviderResponse({ providerResult: providerResult.data, candidates }), internal: { providerFallbackUsed: false, providerFailureCode: null, source: 'provider' } };
    } catch (_error) {
      return { response: services.buildDeterministicAiFallback({ candidates }), internal: { providerFallbackUsed: true, providerFailureCode: 'AI_RESPONSE_BUILD_ERROR', source: 'fallback' } };
    }
  }
  return { response: services.buildDeterministicAiFallback({ candidates }), internal: { providerFallbackUsed: true, providerFailureCode: providerResult.error?.code ?? 'AI_PROVIDER_UNAVAILABLE', source: 'fallback' } };
};
