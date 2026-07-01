import { z } from 'zod';
import prisma from '../prismaClient.js';
import { PROMOTION_DISCOUNT_TYPES, PROMOTION_STATUSES } from '../constants/promotion.constants.js';

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const idArraySchema = z.array(z.coerce.number().int().positive()).optional();

const promotionFieldsSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(255, 'name cannot exceed 255 characters'),
  description: z.string().trim().optional().nullable(),
  discountType: z.enum(PROMOTION_DISCOUNT_TYPES),
  discountValue: z.coerce.number(),
  status: z.enum(PROMOTION_STATUSES).default('draft'),
  priority: z.coerce.number().int().min(0).default(0),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  isActive: z.boolean().optional().default(true),
  productIds: idArraySchema,
  categoryIds: idArraySchema
});

const addPromotionBusinessIssues = (data, ctx, requireTargets) => {
  if (data.discountType === 'percentage' && (data.discountValue <= 0 || data.discountValue > 100)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'percentage discountValue must be > 0 and <= 100' });
  }

  if (data.discountType === 'fixed_amount' && data.discountValue <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'fixed_amount discountValue must be > 0' });
  }

  if (data.startAt >= data.endAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'startAt must be before endAt' });
  }

  const productIds = data.productIds ?? [];
  const categoryIds = data.categoryIds ?? [];

  if (new Set(productIds).size !== productIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productIds'], message: 'productIds cannot contain duplicates' });
  }

  if (new Set(categoryIds).size !== categoryIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['categoryIds'], message: 'categoryIds cannot contain duplicates' });
  }

  if (requireTargets && data.status !== 'draft' && productIds.length === 0 && categoryIds.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productIds'], message: 'productIds or categoryIds is required unless status is draft' });
  }
};

const basePromotionSchema = promotionFieldsSchema.superRefine((data, ctx) => {
  addPromotionBusinessIssues(data, ctx, true);
});

const updatePromotionSchema = promotionFieldsSchema.partial().superRefine((data, ctx) => {
  if (data.productIds && new Set(data.productIds).size !== data.productIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productIds'], message: 'productIds cannot contain duplicates' });
  }

  if (data.categoryIds && new Set(data.categoryIds).size !== data.categoryIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['categoryIds'], message: 'categoryIds cannot contain duplicates' });
  }
});
const statusSchema = z.object({
  status: z.enum(PROMOTION_STATUSES),
  isActive: z.boolean().optional()
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(PROMOTION_STATUSES).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

const promotionInclude = {
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true
    }
  },
  promotionProducts: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          imageUrl: true,
          isActive: true
        }
      }
    }
  },
  promotionCategories: {
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  },
  _count: {
    select: {
      promotionProducts: true,
      promotionCategories: true
    }
  }
};

const parseId = (params) => idParamSchema.parse(params).id;

const toNullableDescription = (description) => {
  if (description === undefined) return undefined;
  if (description === null) return null;
  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const validateReferencedIds = async (productIds = [], categoryIds = []) => {
  const [productCount, categoryCount] = await Promise.all([
    productIds.length > 0 ? prisma.product.count({ where: { id: { in: productIds } } }) : Promise.resolve(0),
    categoryIds.length > 0 ? prisma.category.count({ where: { id: { in: categoryIds } } }) : Promise.resolve(0)
  ]);

  if (productCount !== productIds.length) {
    throw new Error('INVALID_PRODUCT_IDS');
  }

  if (categoryCount !== categoryIds.length) {
    throw new Error('INVALID_CATEGORY_IDS');
  }
};

const buildPromotionData = (data, userId) => {
  const promotionData = {};

  for (const field of ['name', 'discountType', 'discountValue', 'status', 'priority', 'startAt', 'endAt', 'isActive']) {
    if (data[field] !== undefined) promotionData[field] = data[field];
  }

  const description = toNullableDescription(data.description);
  if (description !== undefined) promotionData.description = description;

  if (userId !== undefined) promotionData.createdById = userId;

  return promotionData;
};

const handleValidationError = (error, res) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return true;
  }

  if (error.message === 'INVALID_PRODUCT_IDS') {
    res.status(400).json({ message: 'One or more productIds do not exist' });
    return true;
  }

  if (error.message === 'INVALID_CATEGORY_IDS') {
    res.status(400).json({ message: 'One or more categoryIds do not exist' });
    return true;
  }

  return false;
};

export const getPromotions = async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } }
      ];
    }

    if (query.status) where.status = query.status;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.startDate || query.endDate) {
      where.AND = [];
      if (query.startDate) where.AND.push({ endAt: { gte: query.startDate } });
      if (query.endDate) where.AND.push({ startAt: { lte: query.endDate } });
    }

    const skip = (query.page - 1) * query.limit;
    const [total, promotions] = await prisma.$transaction([
      prisma.promotion.count({ where }),
      prisma.promotion.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
        include: promotionInclude
      })
    ]);

    res.status(200).json({
      data: promotions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    });
  } catch (error) {
    if (handleValidationError(error, res)) return;
    console.error('Get promotions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPromotionById = async (req, res) => {
  try {
    const id = parseId(req.params);
    const promotion = await prisma.promotion.findUnique({
      where: { id },
      include: promotionInclude
    });

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    res.status(200).json(promotion);
  } catch (error) {
    if (handleValidationError(error, res)) return;
    console.error('Get promotion detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createPromotion = async (req, res) => {
  try {
    const data = basePromotionSchema.parse(req.body);
    const productIds = data.productIds ?? [];
    const categoryIds = data.categoryIds ?? [];

    await validateReferencedIds(productIds, categoryIds);

    const promotion = await prisma.$transaction(async (tx) => {
      const created = await tx.promotion.create({
        data: {
          ...buildPromotionData(data, req.user?.id),
          promotionProducts: {
            create: productIds.map((productId) => ({ productId }))
          },
          promotionCategories: {
            create: categoryIds.map((categoryId) => ({ categoryId }))
          }
        }
      });

      return tx.promotion.findUnique({
        where: { id: created.id },
        include: promotionInclude
      });
    });

    res.status(201).json(promotion);
  } catch (error) {
    if (handleValidationError(error, res)) return;
    console.error('Create promotion error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const id = parseId(req.params);
    const data = updatePromotionSchema.parse(req.body);

    const existing = await prisma.promotion.findUnique({
      where: { id },
      include: {
        promotionProducts: { select: { productId: true } },
        promotionCategories: { select: { categoryId: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const nextDiscountType = data.discountType ?? existing.discountType;
    const nextDiscountValue = data.discountValue ?? existing.discountValue;
    const nextStartAt = data.startAt ?? existing.startAt;
    const nextEndAt = data.endAt ?? existing.endAt;
    const nextStatus = data.status ?? existing.status;
    const nextProductIds = data.productIds ?? existing.promotionProducts.map((item) => item.productId);
    const nextCategoryIds = data.categoryIds ?? existing.promotionCategories.map((item) => item.categoryId);

    if (nextDiscountType === 'percentage' && (nextDiscountValue <= 0 || nextDiscountValue > 100)) {
      return res.status(400).json({ message: 'percentage discountValue must be > 0 and <= 100' });
    }

    if (nextDiscountType === 'fixed_amount' && nextDiscountValue <= 0) {
      return res.status(400).json({ message: 'fixed_amount discountValue must be > 0' });
    }

    if (nextStartAt >= nextEndAt) {
      return res.status(400).json({ message: 'startAt must be before endAt' });
    }

    if (nextStatus !== 'draft' && nextProductIds.length === 0 && nextCategoryIds.length === 0) {
      return res.status(400).json({ message: 'productIds or categoryIds is required unless status is draft' });
    }

    if (data.productIds) await validateReferencedIds(data.productIds, []);
    if (data.categoryIds) await validateReferencedIds([], data.categoryIds);

    const promotion = await prisma.$transaction(async (tx) => {
      if (data.productIds) {
        await tx.promotionProduct.deleteMany({ where: { promotionId: id } });
        if (data.productIds.length > 0) {
          await tx.promotionProduct.createMany({
            data: data.productIds.map((productId) => ({ promotionId: id, productId }))
          });
        }
      }

      if (data.categoryIds) {
        await tx.promotionCategory.deleteMany({ where: { promotionId: id } });
        if (data.categoryIds.length > 0) {
          await tx.promotionCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({ promotionId: id, categoryId }))
          });
        }
      }

      const updateData = buildPromotionData(data);
      if (Object.keys(updateData).length > 0) {
        await tx.promotion.update({
          where: { id },
          data: updateData
        });
      }

      return tx.promotion.findUnique({
        where: { id },
        include: promotionInclude
      });
    });

    res.status(200).json(promotion);
  } catch (error) {
    if (handleValidationError(error, res)) return;
    console.error('Update promotion error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePromotionStatus = async (req, res) => {
  try {
    const id = parseId(req.params);
    const data = statusSchema.parse(req.body);

    const existing = await prisma.promotion.findUnique({
      where: { id },
      include: {
        promotionProducts: { select: { productId: true } },
        promotionCategories: { select: { categoryId: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    if (data.status !== 'draft' && existing.promotionProducts.length === 0 && existing.promotionCategories.length === 0) {
      return res.status(400).json({ message: 'productIds or categoryIds is required unless status is draft' });
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {})
      },
      include: promotionInclude
    });

    res.status(200).json(promotion);
  } catch (error) {
    if (handleValidationError(error, res)) return;
    console.error('Update promotion status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const disablePromotion = async (req, res) => {
  try {
    const id = parseId(req.params);

    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        isActive: false,
        status: 'disabled'
      },
      include: promotionInclude
    });

    res.status(200).json({ message: 'Promotion disabled successfully', promotion });
  } catch (error) {
    if (handleValidationError(error, res)) return;
    console.error('Disable promotion error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};