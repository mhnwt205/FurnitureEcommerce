import express from 'express';
import { getAdminAccounts, createAdminAccount, updateAdminAccount, updateAdminAccountStatus } from '../controllers/admin-account.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdminOrStaff, requirePermission('admin_account.view'), getAdminAccounts);
router.post('/', verifyToken, verifyAdminOrStaff, requirePermission('admin_account.create'), createAdminAccount);
router.patch('/:id', verifyToken, verifyAdminOrStaff, requirePermission('admin_account.update'), updateAdminAccount);
router.patch('/:id/status', verifyToken, verifyAdminOrStaff, requirePermission('admin_account.update'), updateAdminAccountStatus);

export default router;
