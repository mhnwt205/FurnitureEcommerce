import express from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../middlewares/permission.middleware.js';
import prisma from '../prismaClient.js';
import { z } from 'zod';

const router = express.Router();
const REVIEWABLE_STATUSES = ['delivered', 'completed'];

const reviewUploadSchema = z.object({
  productId: z.coerce.number().int().positive(),
  orderId: z.coerce.number().int().positive(),
  orderItemId: z.coerce.number().int().positive()
});

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
const uploadReviews = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

const uploadReviewBuffer = (file) => new Promise((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder: 'FurnitureEcommerce/reviews',
      resource_type: 'image'
    },
    (error, result) => {
      if (error) return reject(error);
      resolve(result.secure_url || result.url);
    }
  );

  uploadStream.end(file.buffer);
});

const validateReviewUploadEligibility = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, orderId, orderItemId } = reviewUploadSchema.parse(req.body);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: { in: REVIEWABLE_STATUSES },
        orderItems: {
          some: {
            id: orderItemId,
            productId
          }
        }
      },
      select: { id: true }
    });

    if (!order) {
      return res.status(403).json({ message: 'Ban chi co the upload anh cho san pham da mua va da nhan hang.' });
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        orderItemId
      },
      select: { id: true }
    });

    if (existingReview) {
      return res.status(400).json({ message: 'San pham trong don nay da duoc danh gia.' });
    }

    req.reviewUpload = { productId, orderId, orderItemId };
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Vui long gui productId, orderId va orderItemId hop le.', errors: error.errors });
    }
    console.error('Validate review upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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


router.post('/reviews/multiple', verifyToken, (req, res, next) => {
  const uploadMultiple = uploadReviews.array('images', 5);

  uploadMultiple(req, res, function (err) {
    if (err) return res.status(400).json({ message: 'Lá»—i upload áº£nh: ' + err.message });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Vui lÃ²ng chá»n Ã­t nháº¥t 1 file áº£nh' });

    next();
  });
}, validateReviewUploadEligibility, async (req, res) => {
  try {
    const imageUrls = await Promise.all(req.files.map(uploadReviewBuffer));
    res.status(200).json({ message: 'Upload thÃ nh cÃ´ng', imageUrls });
  } catch (error) {
    console.error('Upload review images error:', error);
    res.status(500).json({ message: 'Khong the upload anh danh gia.' });
  }
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

