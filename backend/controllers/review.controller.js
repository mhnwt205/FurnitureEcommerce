import prisma from '../prismaClient.js';
import { z } from 'zod';

const REVIEWABLE_STATUSES = ['delivered', 'completed'];

const createReviewSchema = z.object({
  productId: z.number().int().positive(),
  orderId: z.number().int().positive(),
  orderItemId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  images: z.array(z.string().url()).max(5).optional().default([])
});

const adminReviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional().default(''),
  approval: z.enum(['all', 'approved', 'hidden']).optional().default('all'),
  rating: z.preprocess((value) => {
    if (value === undefined || value === null || value === '' || value === 'undefined' || value === 'all') return undefined;
    return value;
  }, z.coerce.number().int().min(1).max(5).optional())
});

const parseImages = (images) => {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const serializeReview = (review) => ({
  ...review,
  images: parseImages(review.images)
});

const getReviewSummary = async (productId, approvedOnly = true) => {
  const where = { productId };
  if (approvedOnly) where.isApproved = true;

  const [aggregate, counts] = await Promise.all([
    prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { id: true }
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where,
      _count: { rating: true }
    })
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  counts.forEach((item) => {
    distribution[item.rating] = item._count.rating;
  });

  return {
    averageRating: Number((aggregate._avg.rating || 0).toFixed(1)),
    reviewCount: aggregate._count.id,
    distribution
  };
};

const findReviewableOrderItem = async ({ userId, productId, orderId, orderItemId }) => {
  const orderItemWhere = {
    productId,
    ...(orderItemId ? { id: orderItemId } : {})
  };

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
      status: { in: REVIEWABLE_STATUSES },
      orderItems: { some: orderItemWhere }
    },
    include: {
      orderItems: {
        where: orderItemWhere,
        take: 1
      }
    }
  });

  if (!order || order.orderItems.length === 0) return null;
  return { order, orderItem: order.orderItems[0] };
};

export const getProductReviews = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true }
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const reviews = await prisma.review.findMany({
      where: { productId, isApproved: true },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const summary = await getReviewSummary(productId);
    res.status(200).json({ summary, reviews: reviews.map(serializeReview) });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getReviewEligibility = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const existingReview = await prisma.review.findFirst({
      where: { userId, productId }
    });
    if (existingReview) {
      return res.status(200).json({
        canReview: false,
        reason: 'Bạn đã đánh giá sản phẩm này.',
        review: serializeReview(existingReview)
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        userId,
        status: { in: REVIEWABLE_STATUSES },
        orderItems: { some: { productId } }
      },
      include: {
        orderItems: {
          where: { productId },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!order) {
      return res.status(200).json({
        canReview: false,
        reason: 'Chỉ khách hàng đã nhận hàng mới có thể đánh giá sản phẩm.'
      });
    }

    res.status(200).json({
      canReview: true,
      orderId: order.id,
      orderItemId: order.orderItems[0]?.id || null
    });
  } catch (error) {
    console.error('Get review eligibility error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrderItemReviewEligibility = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderItemId = parseInt(req.params.orderItemId);
    if (isNaN(orderItemId)) {
      return res.status(400).json({ message: 'Invalid order item ID' });
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { id: true, userId: true, status: true } },
        reviews: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    if (!orderItem) {
      return res.status(404).json({ message: 'Order item not found' });
    }

    const payload = {
      orderItemId: orderItem.id,
      productId: orderItem.productId,
      orderId: orderItem.orderId
    };

    if (orderItem.order.userId !== userId) {
      return res.status(403).json({
        eligible: false,
        reason: 'Order item does not belong to current user.',
        ...payload
      });
    }

    if (!REVIEWABLE_STATUSES.includes(orderItem.order.status)) {
      return res.status(200).json({
        eligible: false,
        reason: 'Only delivered or completed orders can be reviewed.',
        ...payload
      });
    }

    if (orderItem.reviews.length > 0) {
      return res.status(200).json({
        eligible: false,
        reason: 'This order item has already been reviewed.',
        ...payload,
        reviewId: orderItem.reviews[0].id
      });
    }

    res.status(200).json({
      eligible: true,
      reason: null,
      ...payload
    });
  } catch (error) {
    console.error('Get order item review eligibility error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = createReviewSchema.parse(req.body);

    const reviewable = await findReviewableOrderItem({
      userId,
      productId: validatedData.productId,
      orderId: validatedData.orderId,
      orderItemId: validatedData.orderItemId
    });
    if (!reviewable) {
      return res.status(403).json({ message: 'Bạn chỉ có thể đánh giá sản phẩm đã mua và đã nhận hàng.' });
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        orderItemId: reviewable.orderItem.id
      }
    });
    if (existingReview) {
      return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm trong đơn này.' });
    }

    const review = await prisma.review.create({
      data: {
        productId: validatedData.productId,
        userId,
        orderId: validatedData.orderId,
        orderItemId: reviewable.orderItem.id,
        rating: validatedData.rating,
        comment: validatedData.comment || null,
        images: JSON.stringify(validatedData.images || []),
        isApproved: true
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } }
      }
    });

    const summary = await getReviewSummary(validatedData.productId);
    res.status(201).json({ message: 'Đánh giá đã được ghi nhận.', review: serializeReview(review), summary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAdminReviews = async (req, res) => {
  try {
    const { page, limit, search, approval, rating } = adminReviewQuerySchema.parse(req.query);
    const where = {};

    if (approval === 'approved') where.isApproved = true;
    if (approval === 'hidden') where.isApproved = false;
    if (rating) where.rating = rating;
    if (search) {
      where.OR = [
        { comment: { contains: search } },
        { product: { name: { contains: search } } },
        { user: { fullName: { contains: search } } },
        { user: { email: { contains: search } } }
      ];
    }

    const skip = (page - 1) * limit;
    const [total, reviews] = await prisma.$transaction([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, imageUrl: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } } },
          user: { select: { id: true, fullName: true, email: true } },
          order: { select: { id: true, orderCode: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    res.status(200).json({
      data: reviews.map(serializeReview),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Get admin reviews error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateReviewApproval = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const schema = z.object({ isApproved: z.boolean() });
    const { isApproved } = schema.parse(req.body);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await prisma.review.update({
      where: { id },
      data: { isApproved },
      include: {
        product: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } }
      }
    });

    res.status(200).json({ message: 'Review updated', review: serializeReview(review) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Review not found' });
    }
    console.error('Update review approval error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};