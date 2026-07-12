import express from 'express';
import { createOrder, lookupOrder, getGuestManagedOrder, cancelGuestManagedOrder, cancelMyOrder, getMyOrders, getMyOrderById, getAdminOrders, getAdminOrderById, getAdminRefunds, getAdminRefundDetail, startAdminRefundProcessing, resolveAdminRefund, updateOrderStatus } from '../controllers/order.controller.js';
import { optionalAuth, verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { orderLookupRateLimiter } from '../middlewares/orderLookupRateLimit.middleware.js';
import { guestOrderManageRateLimiter, guestOrderCancelRateLimiter } from '../middlewares/guestOrderManagementRateLimit.middleware.js';

const router = express.Router();

// Public guest management routes
router.post('/guest/manage', guestOrderManageRateLimiter, getGuestManagedOrder);
router.post('/guest/cancel', guestOrderCancelRateLimiter, cancelGuestManagedOrder);

// Public read-only order lookup route
router.post('/lookup', orderLookupRateLimiter, lookupOrder);

// Shared authenticated/guest create-order route
router.post('/', optionalAuth, createOrder);

// User routes
router.post('/:orderCode/cancel', verifyToken, cancelMyOrder);
router.get('/my-orders', verifyToken, getMyOrders);
router.get('/my-orders/:id', verifyToken, getMyOrderById);

// Admin routes
router.get('/admin/refunds', verifyToken, verifyAdminOrStaff, requirePermission('order.view'), getAdminRefunds);
router.get('/admin/refunds/:requestId', verifyToken, verifyAdminOrStaff, requirePermission('order.view'), getAdminRefundDetail);
router.post('/admin/refunds/:requestId/start-processing', verifyToken, verifyAdminOrStaff, requirePermission('order.update'), startAdminRefundProcessing);
router.post('/admin/refunds/:requestId/resolve', verifyToken, verifyAdminOrStaff, requirePermission('order.update'), resolveAdminRefund);
router.get('/admin', verifyToken, verifyAdminOrStaff, requirePermission('order.view'), getAdminOrders);
router.get('/admin/:id', verifyToken, verifyAdminOrStaff, requirePermission('order.view'), getAdminOrderById);
router.patch('/:id/status', verifyToken, verifyAdminOrStaff, requirePermission('order.update'), updateOrderStatus);

export default router;