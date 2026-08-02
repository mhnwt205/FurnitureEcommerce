import { ZodError } from 'zod';
import {
  AI_ERROR_CODE,
  AiContractError,
  aiAllowedCandidateIdsSchema,
  aiConversationIdSchema,
  aiChatRequestSchema,
  aiProviderResponseSchema
} from './aiContracts.js';

const parseContract = (schema, input, code, message) => {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) throw new AiContractError(code, message);
    throw error;
  }
};

export const parseAiChatRequest = (input) => parseContract(
  aiChatRequestSchema,
  input,
  AI_ERROR_CODE.requestValidation,
  'AI chat request is invalid'
);

export const parseAiConversationId = (input) => parseContract(
  aiConversationIdSchema,
  input,
  AI_ERROR_CODE.requestValidation,
  'AI conversation ID is invalid'
);

export const parseAiProviderResponse = (input) => parseContract(
  aiProviderResponseSchema,
  input,
  AI_ERROR_CODE.providerOutputInvalid,
  'AI provider output is invalid'
);

export const validateRecommendationAllowList = (providerResult, allowedCandidateIds) => {
  const parsed = parseAiProviderResponse(providerResult);
  const parsedAllowedCandidateIds = parseContract(
    aiAllowedCandidateIdsSchema,
    allowedCandidateIds,
    AI_ERROR_CODE.providerIdNotAllowed,
    'AI candidate allow-list is invalid'
  );
  const allowed = new Set(parsedAllowedCandidateIds);
  for (const recommendation of parsed.recommendations) {
    if (!allowed.has(recommendation.id)) {
      throw new AiContractError(
        AI_ERROR_CODE.providerIdNotAllowed,
        'AI provider selected an ID outside the candidate allow-list'
      );
    }
  }
  return parsed;
};
