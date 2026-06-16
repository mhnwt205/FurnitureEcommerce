import express from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Admin routes
router.post('/', verifyToken, verifyAdminOrStaff, requirePermission('product.create'), createProduct);
router.patch('/:id', verifyToken, verifyAdminOrStaff, requirePermission('product.update'), updateProduct);
router.delete('/:id', verifyToken, verifyAdminOrStaff, requirePermission('product.delete'), deleteProduct);

export default router;
