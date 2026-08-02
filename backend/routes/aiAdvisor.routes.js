import express from 'express';
import { aiAdvisorChat } from '../controllers/aiAdvisor.controller.js';
import { createAiAdvisorRateLimiter } from '../middlewares/aiAdvisorRateLimit.middleware.js';

export const createAiAdvisorRouter = ({ rateLimiter = createAiAdvisorRateLimiter(), controller = aiAdvisorChat } = {}) => {
  const router = express.Router();
  router.post('/chat', rateLimiter, controller);
  return router;
};
