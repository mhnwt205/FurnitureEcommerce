import express from 'express';
import {
  createPromotion,
  disablePromotion,
  getPromotionById,
  getPromotions,
  updatePromotion,
  updatePromotionStatus
} from '../controllers/promotion.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdminOrStaff, requirePermission('promotion.view'), getPromotions);
router.get('/:id', verifyToken, verifyAdminOrStaff, requirePermission('promotion.view'), getPromotionById);
router.post('/', verifyToken, verifyAdminOrStaff, requirePermission('promotion.create'), createPromotion);
router.put('/:id', verifyToken, verifyAdminOrStaff, requirePermission('promotion.update'), updatePromotion);
router.patch('/:id/status', verifyToken, verifyAdminOrStaff, requirePermission('promotion.update'), updatePromotionStatus);
router.delete('/:id', verifyToken, verifyAdminOrStaff, requirePermission('promotion.delete'), disablePromotion);

export default router;