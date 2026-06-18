import express from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!'), false);
  }
};

const storageProducts = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'FurnitureEcommerce/products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const uploadProducts = multer({
  storage: storageProducts,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

const storageAvatars = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'FurnitureEcommerce/avatars',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const uploadAvatars = multer({
  storage: storageAvatars,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

router.post('/products', verifyToken, requireAnyPermission(['product.create', 'product.update']), (req, res) => {
  const uploadSingle = uploadProducts.single('image');
  
  uploadSingle(req, res, function (err) {
    if (err) return res.status(400).json({ message: 'Lỗi upload ảnh: ' + err.message });
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file ảnh' });

    res.status(200).json({ message: 'Upload thành công', imageUrl: req.file.path });
  });
});

router.post('/products/multiple', verifyToken, requireAnyPermission(['product.create', 'product.update']), (req, res) => {
  const uploadMultiple = uploadProducts.array('images', 8);
  
  uploadMultiple(req, res, function (err) {
    if (err) return res.status(400).json({ message: 'Lỗi upload ảnh: ' + err.message });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 file ảnh' });

    const imageUrls = req.files.map(file => file.path);
    res.status(200).json({ message: 'Upload thành công', imageUrls });
  });
});

router.post('/avatars', verifyToken, (req, res) => {
  const uploadSingle = uploadAvatars.single('avatar');
  
  uploadSingle(req, res, function (err) {
    if (err) return res.status(400).json({ message: 'Lỗi upload ảnh: ' + err.message });
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file ảnh' });

    res.status(200).json({ message: 'Upload thành công', imageUrl: req.file.path });
  });
});

export default router;

