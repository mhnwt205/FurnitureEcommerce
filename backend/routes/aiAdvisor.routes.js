import express from 'express';
import { chatWithAdvisor } from '../controllers/aiAdvisor.controller.js';
import { aiAdvisorRateLimiter } from '../middlewares/publicRateLimit.middleware.js';

const router = express.Router();

router.post('/chat', aiAdvisorRateLimiter, chatWithAdvisor);

export default router;
