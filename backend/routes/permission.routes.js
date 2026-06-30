import express from 'express';
import { getPermissions } from '../controllers/permission.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdminOrStaff, requirePermission('admin_account.view'), getPermissions);

export default router;
