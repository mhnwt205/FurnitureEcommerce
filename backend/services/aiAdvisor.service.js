import prisma from '../prismaClient.js';

const MAX_RECOMMENDATIONS = 5;
const CATALOG_LIMIT = 30;
const DEFAULT_MODEL = process.env.AI_MODEL || 'gemini-flash-latest';

const CATEGORY_ALIASES = [
  { slug: 'sofa', terms: ['sofa', 'ghe sofa', 'ghe dai'] },
  { slug: 'ban', terms: ['ban', 'ban lam viec', 'ban an', 'ban tra', 'table'] },
  { slug: 'ghe', terms: ['ghe', 'chair'] },
  { slug: 'giuong', terms: ['giuong', 'bed'] },
  { slug: 'tu', terms: ['tu', 'tu quan ao', 'tu sach', 'cabinet'] },
  { slug: 'den', terms: ['den', 'lamp'] }
];

const STOP_WORDS = new Set([
  'toi', 'can', 'muon', 'tim', 'mua', 'san', 'pham', 'cho', 'duoi', 'tren', 'tam', 'khoang',
  'gia', 'trieu', 'nghin', 'dong', 'vnd', 'mot', 'cai', 'chiec', 'va', 'hoac', 'la', 'co',
  'khong', 'tu', 'van', 'giup', 'minh', 'phong', 'nha', 'hom', 'nay', 'thoi', 'tiet', 'the', 'nao'
]);

const normalizeText = (value = '') => value
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toVnd = (value, unit = '') => {
  const number = Number(value.replace(',', '.'));
  if (Number.isNaN(number)) return null;
  const normalizedUnit = normalizeText(unit);
  if (normalizedUnit.startsWith('tr') || normalizedUnit === 'm') return Math.round(number * 1000000);
  if (normalizedUnit.startsWith('nghin') || normalizedUnit === 'k') return Math.round(number * 1000);
  return Math.round(number);
};

const extractBudget = (message) => {
  const normalized = normalizeText(message);
  const patterns = [
    /(duoi|toi da|khong qua|tam|khoang)?\s*(\d+(?:[\.,]\d+)?)\s*(trieu|tr|m)\b/,
    /(duoi|toi da|khong qua|tam|khoang)?\s*(\d+(?:[\.,]\d+)?)\s*(nghin|k)\b/,
    /(duoi|toi da|khong qua|tam|khoang)?\s*(\d{6,})\s*(?:dong|vnd)?\b/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return toVnd(match[2], match[3] || '');
    }
  }
  return null;
};

const extractCategorySlug = (message) => {
  const normalized = normalizeText(message);
  return CATEGORY_ALIASES.find(category => category.terms.some(term => normalized.includes(normalizeText(term))))?.slug || null;
};

const extractKeywords = (message) => normalizeText(message)
  .split(' ')
  .filter(word => word.length >= 3 && !STOP_WORDS.has(word) && Number.isNaN(Number(word)))
  .slice(0, 8);

const hasGeneralCatalogIntent = (message) => {
  const normalized = normalizeText(message);
  return ['noi that', 'san pham', 'tu van', 'goi y', 'mua', 'can tim', 'can mua'].some(term => normalized.includes(term));
};

const buildProductWhere = ({ message, budget, categorySlug }) => {
  const keywords = extractKeywords(message);
  const where = { isActive: true };

  if (budget) {
    where.price = { lte: budget };
  }

  if (categorySlug) {
    where.category = { slug: categorySlug };
  } else if (keywords.length > 0) {
    where.OR = keywords.flatMap(keyword => ([
      { name: { contains: keyword } },
      { description: { contains: keyword } },
      { category: { name: { contains: keyword } } }
    ]));
  }

  return { where, keywords };
};

const getPrimaryImageUrl = (product) => {
  const primary = product.images?.find(image => image.isPrimary) || product.images?.[0];
  return primary?.imageUrl || product.imageUrl || null;
};

const getReviewSummaries = async (productIds) => {
  if (productIds.length === 0) return new Map();
  const summaries = await prisma.review.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds },
      isApproved: true
    },
    _avg: { rating: true },
    _count: { id: true }
  });

  return new Map(summaries.map(item => [item.productId, {
    averageRating: Number((item._avg.rating || 0).toFixed(1)),
    reviewCount: item._count.id
  }]));
};

const scoreProduct = ({ product, normalizedMessage, keywords, budget, categorySlug, currentProduct }) => {
  const haystack = normalizeText(`${product.name} ${product.description || ''} ${product.category?.name || ''}`);
  let score = 0;

  if (product.stock > 0) score += 30;
  if (categorySlug && product.category?.slug === categorySlug) score += 25;
  if (budget && product.price <= budget) score += 20;
  if (currentProduct?.categoryId && product.categoryId === currentProduct.categoryId) score += 8;

  keywords.forEach(keyword => {
    if (haystack.includes(keyword)) score += 7;
  });

  if (normalizedMessage.includes('re') || normalizedMessage.includes('tiet kiem')) {
    score += Math.max(0, 10 - product.price / 1000000);
  }

  score += Math.min(product.reviewCount || 0, 10);
  return score;
};

const serializeRecommendation = (product, reason = '') => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  price: product.price,
  imageUrl: getPrimaryImageUrl(product),
  stock: product.stock,
  category: product.category?.name || null,
  averageRating: product.averageRating || 0,
  reviewCount: product.reviewCount || 0,
  reason
});

const buildRuleBasedReason = ({ product, budget, categorySlug }) => {
  const parts = [];
  if (categorySlug && product.category?.slug === categorySlug) parts.push(`thuộc danh mục ${product.category.name}`);
  if (budget && product.price <= budget) parts.push('nằm trong ngân sách');
  if (product.stock > 0) parts.push(`còn ${product.stock} sản phẩm`);
  if ((product.averageRating || 0) > 0) parts.push(`được đánh giá ${product.averageRating}/5`);
  return parts.length > 0 ? `Phù hợp vì ${parts.join(', ')}.` : 'Phù hợp với nhu cầu tìm kiếm của bạn.';
};

const buildRuleBasedAnswer = ({ recommendations, budget, categorySlug }) => {
  if (recommendations.length === 0) {
    return 'Mình chưa tìm thấy sản phẩm phù hợp trong danh mục đang bán. Bạn có thể nói rõ hơn về loại sản phẩm, ngân sách hoặc không gian cần bố trí.';
  }

  const categoryText = categorySlug ? ' theo đúng danh mục bạn quan tâm' : '';
  let budgetText = '';
  if (budget) {
    const hasWithinBudget = recommendations.some(item => item.price <= budget);
    budgetText = hasWithinBudget
      ? ` trong tầm ngân sách ${budget.toLocaleString('vi-VN')} đồng`
      : ` gần nhất với ngân sách ${budget.toLocaleString('vi-VN')} đồng vì hiện chưa có gợi ý đúng mức này`;
  }
  const topNames = recommendations.slice(0, 3).map(item => item.name).join(', ');
  return `Mình tìm thấy ${recommendations.length} gợi ý${categoryText}${budgetText}. Nổi bật nhất là: ${topNames}. Các gợi ý này đều lấy từ sản phẩm đang bán trong hệ thống.`;
};

const buildCatalogForPrompt = (recommendations) => recommendations.map(item => ({
  id: item.id,
  name: item.name,
  price: item.price,
  stock: item.stock,
  category: item.category,
  averageRating: item.averageRating,
  reviewCount: item.reviewCount
}));

const extractJsonObject = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return trimmed.slice(start, end + 1);
};

const buildGeminiPrompt = ({ message, recommendations }) => JSON.stringify({
  role: 'AI Sales Advisor for FurnitureEcommerce',
  instructions: [
    'Trả lời bằng tiếng Việt có dấu.',
    'Giọng tư vấn thân thiện, ngắn gọn, hữu ích.',
    'Chỉ tư vấn dựa trên allowedProducts do backend cung cấp.',
    'Không bịa sản phẩm, giá, tồn kho, khuyến mãi, chính sách hoặc thông tin ngoài allowedProducts.',
    'Nếu allowedProducts không có sản phẩm phù hợp, hãy nói rõ và không đề xuất sản phẩm.',
    'Chỉ trả về JSON hợp lệ, không markdown, không giải thích ngoài JSON.'
  ],
  customerMessage: message,
  allowedProducts: buildCatalogForPrompt(recommendations),
  responseFormat: {
    answer: 'string',
    recommendations: [{ id: 'number', reason: 'string' }]
  }
});

const callGemini = async ({ message, recommendations }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || recommendations.length === 0) return null;

  const model = encodeURIComponent(DEFAULT_MODEL);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildGeminiPrompt({ message, recommendations }) }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim();
  const jsonText = extractJsonObject(content);
  if (!jsonText) return null;

  const parsed = JSON.parse(jsonText);
  if (!parsed.answer || typeof parsed.answer !== 'string') return null;

  const allowedIds = new Set(recommendations.map(item => item.id));
  const reasonMap = new Map(
    Array.isArray(parsed.recommendations)
      ? parsed.recommendations
        .filter(item => allowedIds.has(item.id) && typeof item.reason === 'string')
        .map(item => [item.id, item.reason])
      : []
  );

  return {
    answer: parsed.answer,
    reasonMap
  };
};

export const getAdvisorResponse = async ({ message, context = {} }) => {
  const budget = extractBudget(message);
  const categorySlug = extractCategorySlug(message);
  const normalizedMessage = normalizeText(message);
  const { where, keywords } = buildProductWhere({ message, budget, categorySlug });

  if (!budget && !categorySlug && keywords.length === 0 && !hasGeneralCatalogIntent(message)) {
    return {
      answer: buildRuleBasedAnswer({ recommendations: [], budget, categorySlug }),
      recommendations: [],
      mode: 'rule-based'
    };
  }

  const currentProductId = Number(context.currentProductId);
  const currentProduct = Number.isInteger(currentProductId) && currentProductId > 0
    ? await prisma.product.findFirst({ where: { id: currentProductId, isActive: true } })
    : null;

  let products = await prisma.product.findMany({
    where,
    take: CATALOG_LIMIT,
    include: {
      category: true,
      images: {
        orderBy: [
          { isPrimary: 'desc' },
          { sortOrder: 'asc' },
          { id: 'asc' }
        ],
        take: 3
      }
    },
    orderBy: [
      { stock: 'desc' },
      { price: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  if (products.length === 0 && categorySlug) {
    products = await prisma.product.findMany({
      where: {
        isActive: true,
        category: { slug: categorySlug }
      },
      take: CATALOG_LIMIT,
      include: {
        category: true,
        images: {
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' },
            { id: 'asc' }
          ],
          take: 3
        }
      },
      orderBy: [
        { stock: 'desc' },
        { price: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  if (products.length === 0 && budget && !categorySlug) {
    products = await prisma.product.findMany({
      where: {
        isActive: true,
        price: { lte: budget }
      },
      take: CATALOG_LIMIT,
      include: {
        category: true,
        images: {
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' },
            { id: 'asc' }
          ],
          take: 3
        }
      },
      orderBy: [
        { stock: 'desc' },
        { price: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  const summaryMap = await getReviewSummaries(products.map(product => product.id));
  const enrichedProducts = products.map(product => ({
    ...product,
    averageRating: summaryMap.get(product.id)?.averageRating || 0,
    reviewCount: summaryMap.get(product.id)?.reviewCount || 0
  }));

  const rankedProducts = enrichedProducts
    .map(product => ({
      product,
      score: scoreProduct({ product, normalizedMessage, keywords, budget, categorySlug, currentProduct })
    }))
    .sort((a, b) => b.score - a.score || b.product.stock - a.product.stock || a.product.price - b.product.price)
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ product }) => product);

  let recommendations = rankedProducts.map(product => serializeRecommendation(product, buildRuleBasedReason({ product, budget, categorySlug })));
  let answer = buildRuleBasedAnswer({ recommendations, budget, categorySlug });
  let mode = 'rule-based';

  try {
    const aiResult = await callGemini({ message, recommendations });
    if (aiResult) {
      mode = 'gemini';
      answer = aiResult.answer;
      recommendations = recommendations.map(item => ({
        ...item,
        reason: aiResult.reasonMap.get(item.id) || item.reason
      }));
    }
  } catch (error) {
    console.error('AI advisor Gemini fallback:', error.message);
  }

  return { answer, recommendations, mode };
};
