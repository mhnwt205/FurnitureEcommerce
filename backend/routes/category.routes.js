import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getCategories);

// Admin routes
router.post('/', verifyToken, verifyAdminOrStaff, requirePermission('category.create'), createCategory);
router.patch('/:id', verifyToken, verifyAdminOrStaff, requirePermission('category.update'), updateCategory);
router.delete('/:id', verifyToken, verifyAdminOrStaff, requirePermission('category.delete'), deleteCategory);

export default router;
