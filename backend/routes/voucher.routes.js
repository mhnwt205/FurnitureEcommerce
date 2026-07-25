import express from 'express';
import * as controller from '../controllers/voucher.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();
router.get('/', verifyToken, controller.listMyVouchers);
router.get('/:id', verifyToken, controller.getMyVoucher);
export default router;
