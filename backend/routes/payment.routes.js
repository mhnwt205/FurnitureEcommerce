import express from 'express';
import { createPaymentUrl, vnpayIPN, verifyPaymentResult } from '../controllers/payment.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/vnpay/create-url', verifyToken, createPaymentUrl);
router.get('/vnpay/ipn', vnpayIPN);
router.get('/vnpay/verify-result', verifyPaymentResult);

export default router;
