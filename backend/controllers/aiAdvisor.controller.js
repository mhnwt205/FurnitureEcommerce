import { z } from 'zod';
import { getAdvisorResponse } from '../services/aiAdvisor.service.js';

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1000, 'Message must be at most 1000 characters'),
  context: z.object({
    currentProductId: z.coerce.number().int().positive().optional()
  }).optional().default({})
});

export const chatWithAdvisor = async (req, res) => {
  try {
    const { message, context } = chatSchema.parse(req.body || {});
    const result = await getAdvisorResponse({ message, context });

    res.status(200).json({
      answer: result.answer,
      recommendations: result.recommendations
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }

    console.error('AI advisor chat error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};