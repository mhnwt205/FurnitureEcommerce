import { z } from 'zod';
import { processAiConversation } from '../services/ai-advisor/index.js';

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1000, 'Message must be at most 1000 characters'),
  context: z.object({
    currentProductId: z.coerce.number().int().positive().optional()
  }).optional().default({}),
  sessionId: z.string().uuid().optional(),
  clientMessageId: z.string().trim().min(1).max(64).optional(),
  resetSession: z.boolean().optional().default(false)
}).strict();

export const createChatWithAdvisor = ({ processConversation = processAiConversation } = {}) => async (req, res) => {
  try {
    const { message, context, sessionId, clientMessageId, resetSession } = chatSchema.parse(req.body || {});
    const result = await processConversation({ message, context, sessionId, clientMessageId, resetSession, ownerUserId: req.user?.id ?? null, requestId: req.requestId ?? null });
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }

    console.error('AI advisor chat error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const chatWithAdvisor = createChatWithAdvisor();
