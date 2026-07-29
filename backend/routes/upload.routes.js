import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../middlewares/permission.middleware.js';
import prisma from '../prismaClient.js';
import { z } from 'zod';
import { uploadRateLimiter } from '../middlewares/publicRateLimit.middleware.js';
import { cleanupCloudinaryAssets, uploadImageAsset, uploadImageBuffer } from '../utils/cloudinaryUpload.js';
import { assertImageSignature } from '../utils/imageSignature.js';

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

const uploadProducts = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

const uploadAvatars = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});
const uploadReviews = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

const uploadImage = (file, folder) => uploadImageBuffer({ cloudinary, buffer: file.buffer, folder });
const logUploadError = (requestId, error, context = {}) => {
  console.error('Product image upload failed:', {
    requestId,
    ...context,
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
    http_code: error?.http_code,
    response: error?.response,
    error
  }, error);
};

const uploadVerifiedImages = async (files, folder, requestId) => {
  files.forEach(assertImageSignature);
  const uploaded = [];
  try {
    for (const file of files) {
      const metadata = { requestId, fileName: file.originalname, fileSize: file.size, mimetype: file.mimetype };
      console.info('Uploading file:', { ...metadata, folder });
      uploaded.push(await uploadImageAsset({ cloudinary, buffer: file.buffer, folder, ...metadata }));
    }
    return uploaded.map((asset) => asset.imageUrl);
  } catch (error) {
    await cleanupCloudinaryAssets({ cloudinary, assets: uploaded });
    throw error;
  }
};

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

export const createUploadRouter = ({
  verifyTokenMiddleware = verifyToken,
  uploadRateLimiterMiddleware = uploadRateLimiter,
  requireAnyPermissionMiddleware = requireAnyPermission,
  productUploadMiddleware = uploadProducts,
  uploadImageMiddleware = uploadImage
} = {}) => {
  const router = express.Router();

router.post('/products', verifyTokenMiddleware, uploadRateLimiterMiddleware, requireAnyPermissionMiddleware(['product.create', 'product.update']), (req, res) => {
  const uploadSingle = productUploadMiddleware.single('image');
  
  uploadSingle(req, res, function (err) {
    if (err) return res.status(400).json({ message: 'Lỗi upload ảnh: ' + err.message });
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file ảnh' });

    try { assertImageSignature(req.file); } catch { return res.status(400).json({ message: 'Invalid image file signature.' }); }
    return uploadImageMiddleware(req.file, 'FurnitureEcommerce/products')
      .then((imageUrl) => res.status(200).json({ message: 'Upload thành công', imageUrl }))
      .catch(() => res.status(502).json({ message: 'Image upload failed.', requestId: req.requestId }));
  });
});

router.post('/products/multiple', verifyTokenMiddleware, uploadRateLimiterMiddleware, requireAnyPermissionMiddleware(['product.create', 'product.update']), (req, res) => {
  const uploadMultiple = uploadProducts.array('images', 8);
  
  uploadMultiple(req, res, function (err) {
    if (err) logUploadError(req.requestId, err, { stage: 'multer' });
    if (err) return res.status(400).json({ message: 'Lỗi upload ảnh: ' + err.message });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 file ảnh' });

    const files = req.files.map((file) => ({ fileName: file.originalname, fileSize: file.size, mimetype: file.mimetype }));
    console.info('Product image upload batch received:', { requestId: req.requestId, fileCount: req.files.length, files });
    return uploadVerifiedImages(req.files, 'FurnitureEcommerce/products', req.requestId)
      .then((imageUrls) => res.status(200).json({ message: 'Upload thành công', imageUrls }))
      .catch((error) => {
        logUploadError(req.requestId, error, { stage: 'upload_or_validation', fileCount: req.files.length, files });
        return res.status(502).json({ message: 'Image upload failed.', requestId: req.requestId });
      });
  });
});


router.post('/reviews/multiple', verifyTokenMiddleware, uploadRateLimiterMiddleware, (req, res, next) => {
  const uploadMultiple = uploadReviews.array('images', 5);

  uploadMultiple(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: 'Lá»—i upload áº£nh: ' + err.message });
    }
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Vui lÃ²ng chá»n Ã­t nháº¥t 1 file áº£nh' });

    next();
  });
}, validateReviewUploadEligibility, async (req, res) => {
  try {
    const imageUrls = await uploadVerifiedImages(req.files, 'FurnitureEcommerce/reviews');
    res.status(200).json({ message: 'Upload thÃ nh cÃ´ng', imageUrls });
  } catch (error) {
    console.error('Upload review images error:', error);
    res.status(500).json({ message: 'Khong the upload anh danh gia.' });
  }
});
router.post('/avatars', verifyTokenMiddleware, uploadRateLimiterMiddleware, (req, res) => {
  const uploadSingle = uploadAvatars.single('avatar');
  
  uploadSingle(req, res, function (err) {
    if (err) return res.status(400).json({ message: 'Lỗi upload ảnh: ' + err.message });
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file ảnh' });

    try { assertImageSignature(req.file); } catch { return res.status(400).json({ message: 'Invalid image file signature.' }); }
    return uploadImage(req.file, 'FurnitureEcommerce/avatars')
      .then((imageUrl) => res.status(200).json({ message: 'Upload thành công', imageUrl }))
      .catch(() => res.status(502).json({ message: 'Image upload failed.', requestId: req.requestId }));
  });
});

return router;
};

export default createUploadRouter();

