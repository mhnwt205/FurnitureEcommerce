import prisma from '../prismaClient.js';
import { Prisma } from '@prisma/client';
import { PROMOTION_DISCOUNT_TYPES } from '../constants/promotion.constants.js';

const ACTIVE_PROMOTION_STATUSES = ['scheduled', 'active'];

const emptyPricing = (price) => ({
  originalPrice: price,
  finalPrice: price,
  displayPrice: price,
  discountAmount: 0,
  discountPercent: 0,
  hasPromotion: false,
  promotion: null
});

const roundMoney = (value) => Number(Math.max(value, 0).toFixed(2));

const toPromotionSummary = (promotion) => ({
  id: promotion.id,
  name: promotion.name,
  discountType: promotion.discountType,
  discountValue: promotion.discountValue,
  startAt: promotion.startAt,
  endAt: promotion.endAt,
  priority: promotion.priority
});

const isPromotionApplicableToProduct = (promotion, product) => {
  const directProductMatch = promotion.promotionProducts?.some(
    (item) => item.productId === product.id
  );

  const categoryMatch = promotion.promotionCategories?.some(
    (item) => item.categoryId === product.categoryId
  );

  return directProductMatch || categoryMatch;
};

const calculateDiscount = (price, promotion) => {
  if (promotion.discountType === 'percentage') {
    return roundMoney(price * promotion.discountValue / 100);
  }

  if (promotion.discountType === 'fixed_amount') {
    return roundMoney(Math.min(promotion.discountValue, price));
  }

  return 0;
};

const isBetterPromotion = (candidate, currentBest) => {
  if (!currentBest) return true;

  if (candidate.promotion.priority !== currentBest.promotion.priority) {
    return candidate.promotion.priority > currentBest.promotion.priority;
  }

  if (candidate.discountAmount !== currentBest.discountAmount) {
    return candidate.discountAmount > currentBest.discountAmount;
  }

  const candidateEnd = new Date(candidate.promotion.endAt).getTime();
  const currentEnd = new Date(currentBest.promotion.endAt).getTime();
  if (candidateEnd !== currentEnd) {
    return candidateEnd < currentEnd;
  }

  return candidate.promotion.id < currentBest.promotion.id;
};

export const getActivePromotionsForProducts = async (productIds) => {
  const uniqueProductIds = [...new Set((productIds ?? []).filter(Boolean))];
  if (uniqueProductIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds } },
    select: { id: true, categoryId: true }
  });

  const categoryIds = [...new Set(products.map((product) => product.categoryId).filter(Boolean))];
  const now = new Date();

  return prisma.promotion.findMany({
    where: {
      isActive: true,
      status: { in: ACTIVE_PROMOTION_STATUSES },
      startAt: { lte: now },
      endAt: { gte: now },
      OR: [
        { promotionProducts: { some: { productId: { in: uniqueProductIds } } } },
        { promotionCategories: { some: { categoryId: { in: categoryIds } } } }
      ]
    },
    include: {
      promotionProducts: {
        select: { productId: true }
      },
      promotionCategories: {
        select: { categoryId: true }
      }
    }
  });
};

export const calculatePromotionForProduct = (product, candidatePromotions = []) => {
  const originalPrice = Number(product?.price ?? 0);
  let bestPromotion = null;

  for (const promotion of candidatePromotions) {
    if (!isPromotionApplicableToProduct(promotion, product)) continue;
    if (!PROMOTION_DISCOUNT_TYPES.includes(promotion.discountType)) continue;

    const discountAmount = calculateDiscount(originalPrice, promotion);
    const finalPrice = roundMoney(originalPrice - discountAmount);
    const discountPercent = promotion.discountType === 'percentage'
      ? promotion.discountValue
      : originalPrice > 0
        ? Math.round(discountAmount / originalPrice * 100)
        : 0;

    const candidate = {
      promotion,
      originalPrice,
      finalPrice,
      displayPrice: finalPrice,
      discountAmount,
      discountPercent,
      hasPromotion: discountAmount > 0,
      promotionSummary: toPromotionSummary(promotion)
    };

    if (candidate.hasPromotion && isBetterPromotion(candidate, bestPromotion)) {
      bestPromotion = candidate;
    }
  }

  if (!bestPromotion) return emptyPricing(originalPrice);

  return {
    originalPrice: bestPromotion.originalPrice,
    finalPrice: bestPromotion.finalPrice,
    displayPrice: bestPromotion.displayPrice,
    discountAmount: bestPromotion.discountAmount,
    discountPercent: bestPromotion.discountPercent,
    hasPromotion: true,
    promotion: bestPromotion.promotionSummary
  };
};

export const attachPricingToProducts = async (products) => {
  if (!Array.isArray(products) || products.length === 0) return products;

  const productIds = products.map((product) => product.id).filter(Boolean);
  const candidatePromotions = await getActivePromotionsForProducts(productIds);

  return products.map((product) => ({
    ...product,
    ...calculatePromotionForProduct(product, candidatePromotions)
  }));
};

export const attachPricingToProduct = async (product) => {
  if (!product) return product;
  const [productWithPricing] = await attachPricingToProducts([product]);
  return productWithPricing;
};
const toSqlLike = (value) => `%${String(value).trim().replace(/[\%_\[]/g, (match) => `[${match}]`)}%`;

const toPriceNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const buildProductFilterSql = ({ includeInactive, category, search, color, material, roomType, style }) => {
  const filters = [];

  if (includeInactive !== true) {
    filters.push(Prisma.sql`p.[isActive] = 1`);
  }

  if (category && category !== 'ALL') {
    const categoryLike = toSqlLike(category);
    filters.push(Prisma.sql`(c.[slug] = ${category} OR c.[name] LIKE ${categoryLike})`);
  }

  if (search && String(search).trim() !== '') {
    const searchLike = toSqlLike(search);
    filters.push(Prisma.sql`(p.[name] LIKE ${searchLike} OR p.[description] LIKE ${searchLike} OR c.[name] LIKE ${searchLike})`);
  }

  if (color && String(color).trim() !== '') {
    filters.push(Prisma.sql`p.[color] LIKE ${toSqlLike(color)}`);
  }

  if (material && String(material).trim() !== '') {
    filters.push(Prisma.sql`p.[material] LIKE ${toSqlLike(material)}`);
  }

  if (roomType && String(roomType).trim() !== '') {
    filters.push(Prisma.sql`p.[roomType] LIKE ${toSqlLike(roomType)}`);
  }

  if (style && String(style).trim() !== '') {
    filters.push(Prisma.sql`p.[style] LIKE ${toSqlLike(style)}`);
  }

  return filters.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
    : Prisma.empty;
};

const buildFinalPriceFilterSql = ({ minPrice, maxPrice }) => {
  const filters = [];
  const min = toPriceNumber(minPrice);
  const max = toPriceNumber(maxPrice);

  if (min !== null) filters.push(Prisma.sql`[finalPrice] >= ${min}`);
  if (max !== null) filters.push(Prisma.sql`[finalPrice] <= ${max}`);

  return filters.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
    : Prisma.empty;
};

const buildPromotionAwareOrderSql = (sort) => {
  if (sort === 'price_asc') return Prisma.sql`[finalPrice] ASC, [id] DESC`;
  if (sort === 'price_desc') return Prisma.sql`[finalPrice] DESC, [id] DESC`;
  if (sort === 'name_asc') return Prisma.sql`[name] ASC, [id] DESC`;
  if (sort === 'popular') return Prisma.sql`[stock] DESC, [id] DESC`;
  return Prisma.sql`[createdAt] DESC, [id] DESC`;
};

const promotionAwareProductCte = (filters) => Prisma.sql`
WITH PromotionAwareProducts AS (
  SELECT
    p.[id],
    p.[name],
    p.[stock],
    p.[createdAt],
    p.[price] - ISNULL(bestPromotion.[discountAmount], 0) AS [finalPrice]
  FROM [dbo].[Product] p
  INNER JOIN [dbo].[Category] c ON c.[id] = p.[categoryId]
  OUTER APPLY (
    SELECT TOP 1
      pr.[id],
      pr.[priority],
      pr.[endAt],
      CASE
        WHEN pr.[discountType] = 'percentage' THEN p.[price] * pr.[discountValue] / 100
        WHEN pr.[discountType] = 'fixed_amount' THEN CASE WHEN pr.[discountValue] < p.[price] THEN pr.[discountValue] ELSE p.[price] END
        ELSE 0
      END AS [discountAmount]
    FROM [dbo].[Promotion] pr
    LEFT JOIN [dbo].[PromotionProduct] pp ON pp.[promotionId] = pr.[id] AND pp.[productId] = p.[id]
    LEFT JOIN [dbo].[PromotionCategory] pc ON pc.[promotionId] = pr.[id] AND pc.[categoryId] = p.[categoryId]
    WHERE pr.[isActive] = 1
      AND pr.[status] IN ('scheduled', 'active')
      AND pr.[startAt] <= SYSUTCDATETIME()
      AND pr.[endAt] >= SYSUTCDATETIME()
      AND (pp.[productId] IS NOT NULL OR pc.[categoryId] IS NOT NULL)
    ORDER BY
      pr.[priority] DESC,
      CASE
        WHEN pr.[discountType] = 'percentage' THEN p.[price] * pr.[discountValue] / 100
        WHEN pr.[discountType] = 'fixed_amount' THEN CASE WHEN pr.[discountValue] < p.[price] THEN pr.[discountValue] ELSE p.[price] END
        ELSE 0
      END DESC,
      pr.[endAt] ASC,
      pr.[id] ASC
  ) bestPromotion
  ${buildProductFilterSql(filters)}
)
`;

export const getPromotionAwareProductPage = async ({
  filters = {},
  minPrice,
  maxPrice,
  sort = 'newest',
  page = 1,
  limit = 0
} = {}) => {
  const finalPriceFilter = buildFinalPriceFilterSql({ minPrice, maxPrice });
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 0, 0);
  const offset = safeLimit > 0 ? (safePage - 1) * safeLimit : 0;
  const orderBy = buildPromotionAwareOrderSql(sort);
  const cte = promotionAwareProductCte(filters);

  const totalRows = await prisma.$queryRaw`
    ${cte}
    SELECT COUNT(*) AS [total]
    FROM PromotionAwareProducts
    ${finalPriceFilter}
  `;

  const pageRows = safeLimit > 0
    ? await prisma.$queryRaw`
      ${cte}
      SELECT [id]
      FROM PromotionAwareProducts
      ${finalPriceFilter}
      ORDER BY ${orderBy}
      OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `
    : await prisma.$queryRaw`
      ${cte}
      SELECT [id]
      FROM PromotionAwareProducts
      ${finalPriceFilter}
      ORDER BY ${orderBy}
    `;

  return {
    ids: pageRows.map((row) => Number(row.id)),
    total: Number(totalRows[0]?.total || 0)
  };
};