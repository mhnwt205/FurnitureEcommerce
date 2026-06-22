import express from 'express';
import { chatWithAdvisor } from '../controllers/aiAdvisor.controller.js';

const router = express.Router();

router.post('/chat', chatWithAdvisor);

export default router;