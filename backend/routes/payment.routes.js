import express from 'express';
import { createPaymentUrl, vnpayIPN } from '../controllers/payment.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/vnpay/create-url', verifyToken, createPaymentUrl);
router.get('/vnpay/ipn', vnpayIPN);

export default router;
