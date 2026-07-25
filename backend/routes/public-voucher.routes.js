import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { listPublicVouchers } from '../controllers/voucher.controller.js';

const router = express.Router();

router.get('/', verifyToken, listPublicVouchers);

export default router;
