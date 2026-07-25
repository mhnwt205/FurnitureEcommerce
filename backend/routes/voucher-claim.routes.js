import express from 'express'; import { verifyToken } from '../middlewares/auth.middleware.js'; import { claimVoucher } from '../controllers/voucher.controller.js';
const router=express.Router(); router.post('/',verifyToken,claimVoucher); export default router;
