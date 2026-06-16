import express from 'express';
import { getPermissions } from '../controllers/permission.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';

const router = express.Router();

router.get('/', verifyToken, verifyAdminOrStaff, getPermissions);

export default router;
