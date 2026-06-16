import express from 'express';
import { createOrder, getMyOrders, getMyOrderById, getAdminOrders, getAdminOrderById, updateOrderStatus } from '../controllers/order.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

// User routes
router.post('/', verifyToken, createOrder);
router.get('/my-orders', verifyToken, getMyOrders);
router.get('/my-orders/:id', verifyToken, getMyOrderById);

// Admin routes
router.get('/admin', verifyToken, verifyAdminOrStaff, requirePermission('order.view'), getAdminOrders);
router.get('/admin/:id', verifyToken, verifyAdminOrStaff, requirePermission('order.view'), getAdminOrderById);
router.patch('/:id/status', verifyToken, verifyAdminOrStaff, requirePermission('order.update'), updateOrderStatus);

export default router;
