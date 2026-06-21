import express from 'express';
import {
  createReview,
  getAdminReviews,
  getProductReviews,
  getReviewEligibility,
  getOrderItemReviewEligibility,
  updateReviewApproval
} from '../controllers/review.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

router.get('/products/:productId', getProductReviews);
router.get('/products/:productId/eligibility', verifyToken, getReviewEligibility);
router.get('/order-items/:orderItemId/eligibility', verifyToken, getOrderItemReviewEligibility);
router.post('/', verifyToken, createReview);

router.get('/admin', verifyToken, verifyAdminOrStaff, requirePermission('review.view'), getAdminReviews);
router.patch('/:id/approval', verifyToken, verifyAdminOrStaff, requirePermission('review.update'), updateReviewApproval);

export default router;
