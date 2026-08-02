import { AI_CONVERSATION_HEADER, AI_ERROR_CODE, AiContractError } from '../services/ai/aiContracts.js';
import { processAiChat } from '../services/ai/aiChat.service.js';
import { parseAiConversationId } from '../services/ai/aiValidation.js';
import { logger } from '../utils/logger.js';

const safeLog = (loggerImpl, level, event, metadata) => {
  try { loggerImpl?.[level]?.(event, metadata); } catch {}
};

const providerOutcome = (source) => ['provider', 'fallback', 'no_result'].includes(source) ? source : 'unknown';
const errorCategory = (error) => {
  if (error?.code === AI_ERROR_CODE.requestValidation) return 'request_validation';
  if (error?.code === AI_ERROR_CODE.promptBuild) return 'prompt_build_failure';
  if (error?.status === 503) return 'retrieval_unavailable';
  return 'internal_failure';
};

export const createAiAdvisorController = ({ processAiChat: process = processAiChat, loggerImpl = logger, now = Date.now } = {}) => async (req, res) => {
  const startedAt = now();
  try {
    const header = req.get?.(AI_CONVERSATION_HEADER) ?? req.headers?.[AI_CONVERSATION_HEADER.toLowerCase()];
    const conversationId = header === undefined ? undefined : parseAiConversationId(header);
    const result = await process(req.body, { conversationId });
    const { answer, recommendations } = result.response;
    safeLog(loggerImpl, 'info', 'ai_request_completed', {
      requestId: req.requestId,
      statusCode: 200,
      durationMs: Math.max(0, now() - startedAt),
      recommendationCount: recommendations.length,
      providerFallbackUsed: result.internal?.providerFallbackUsed === true,
      providerOutcome: providerOutcome(result.internal?.source)
    });
    if (result.internal?.conversationId) res.set(AI_CONVERSATION_HEADER, result.internal.conversationId);
    return res.status(200).json({ answer, recommendations });
  } catch (error) {
    const statusCode = error instanceof AiContractError && error.code === AI_ERROR_CODE.requestValidation ? 400 : error?.status === 503 ? 503 : 500;
    safeLog(loggerImpl, statusCode >= 500 ? 'error' : 'warn', 'ai_request_failed', {
      requestId: req.requestId,
      statusCode,
      durationMs: Math.max(0, now() - startedAt),
      errorCode: errorCategory(error)
    });
    if (statusCode === 400) return res.status(400).json({ message: 'Yêu cầu không hợp lệ.' });
    if (statusCode === 503) return res.status(503).json({ message: 'Dịch vụ tạm thời không khả dụng.' });
    return res.status(500).json({ message: 'Không thể xử lý yêu cầu lúc này.' });
  }
};

export const aiAdvisorChat = createAiAdvisorController();
