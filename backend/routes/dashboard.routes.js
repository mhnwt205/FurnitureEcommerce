import express from 'express';
import { getDashboardSummary, getDashboardCharts, getDashboardWidgets } from '../controllers/dashboard.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

router.get('/summary', verifyToken, verifyAdminOrStaff, requirePermission('dashboard.view'), getDashboardSummary);
router.get('/charts', verifyToken, verifyAdminOrStaff, requirePermission('dashboard.view'), getDashboardCharts);
router.get('/widgets', verifyToken, verifyAdminOrStaff, requirePermission('dashboard.view'), getDashboardWidgets);

export default router;
