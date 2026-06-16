import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = 'uploads/products';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

router.post('/products', verifyToken, requireAnyPermission(['product.create', 'product.update']), (req, res) => {
  const uploadSingle = upload.single('image');
  
  uploadSingle(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Lỗi upload ảnh: ' + err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file ảnh' });
    }

    // Return the URL path
    const imageUrl = `/uploads/products/${req.file.filename}`;
    res.status(200).json({ message: 'Upload thành công', imageUrl });
  });
});

router.post('/products/multiple', verifyToken, requireAnyPermission(['product.create', 'product.update']), (req, res) => {
  const uploadMultiple = upload.array('images', 8);
  
  uploadMultiple(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Lỗi upload ảnh: ' + err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 file ảnh' });
    }

    const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
    res.status(200).json({ message: 'Upload thành công', imageUrls });
  });
});

export default router;
