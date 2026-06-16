import express from 'express';
import { getCustomers, getCustomerById, updateCustomerStatus, getMyProfile, updateMyProfile } from '../controllers/customer.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

router.get('/me', verifyToken, getMyProfile);
router.put('/me', verifyToken, updateMyProfile);

router.get('/', verifyToken, verifyAdminOrStaff, requirePermission('customer.view'), getCustomers);
router.get('/:id', verifyToken, verifyAdminOrStaff, requirePermission('customer.view'), getCustomerById);
router.patch('/:id/status', verifyToken, verifyAdminOrStaff, requirePermission('customer.update'), updateCustomerStatus);

export default router;
