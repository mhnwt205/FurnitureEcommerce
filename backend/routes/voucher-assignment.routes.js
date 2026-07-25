import express from 'express';
import { assignVouchers } from '../controllers/voucher.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

router.post('/', verifyToken, requirePermission('voucher_assignment.create'), assignVouchers);

export default router;
