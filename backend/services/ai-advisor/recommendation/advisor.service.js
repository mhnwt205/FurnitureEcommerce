import prisma from '../../../prismaClient.js';
import { logger } from '../../../utils/logger.js';
import { attachPricingToProducts } from '../../promotionPricing.service.js';
import { extractStructuredIntent } from '../intent/intent-extraction.service.js';
import { intentToLegacy, legacyToIntent } from '../intent/intent.taxonomy.js';
import { retrieveAdvisorCandidates } from '../candidates/retrieval.service.js';
import { applyCandidateEligibility } from '../candidates/eligibility.service.js';
import { classifyAdvisorConstraints } from '../intent/constraint-classification.service.js';
import { buildComparativePolicy } from '../comparative/policy.service.js';
import { applyComparativeEligibility } from '../comparative/eligibility.service.js';
import { scoreComparativePreferences } from '../comparative/scoring.service.js';
import { diversifyRecommendations } from './diversification.service.js';
import { buildRecommendationReasons, deterministicReasonMap, validateGroundedWriterOutput } from './reason.service.js';
import { aiTelemetry } from '../telemetry/telemetry.service.js';
import { classifyAiTelemetryError, telemetryModel } from '../telemetry/sanitizer.service.js';

const MAX_RECOMMENDATIONS = 5;
const CATALOG_LIMIT = 50;
const DEFAULT_MODEL = process.env.AI_MODEL || 'gemini-flash-latest';

const CATEGORY_ALIASES = [
  { slug: 'sofa', terms: ['sofa', 'ghe sofa', 'ghe dai'] },
  { slug: 'ban', terms: ['ban', 'ban lam viec', 'ban an', 'ban tra', 'table'] },
  { slug: 'ghe', terms: ['ghe', 'chair'] },
  { slug: 'giuong', terms: ['giuong', 'bed'] },
  { slug: 'tu', terms: ['tu', 'tu quan ao', 'tu sach', 'cabinet'] },
  { slug: 'den', terms: ['den', 'lamp'] }
];

const ATTRIBUTE_DICTIONARY = {
  colors: ['trang', 'den', 'xam', 'ghi', 'nau', 'vang', 'be', 'kem', 'xanh'],
  materials: ['go cong nghiep', 'go tu nhien', 'go', 'da pu', 'da', 'vai', 'ni', 'kim loai', 'kinh', 'may', 'nhua'],
  rooms: ['phong khach', 'phong ngu', 'phong lam viec', 'van phong', 'bep', 'ban cong'],
  styles: ['hien dai', 'toi gian', 'co dien', 'luxury', 'sang trong', 'vintage', 'bac au']
};

const SIZE_WORDS = ['nho', 'lon', 'mini', 'rong', 'cao', 'thap'];

const TERM_LABELS = {
  trang: 'trắng',
  den: 'đen',
  xam: 'xám',
  ghi: 'ghi',
  nau: 'nâu',
  go: 'gỗ',
  vang: 'vàng',
  be: 'be',
  kem: 'kem',
  xanh: 'xanh',
  'go cong nghiep': 'gỗ công nghiệp',
  'go tu nhien': 'gỗ tự nhiên',
  'da pu': 'da PU',
  da: 'da',
  vai: 'vải',
  ni: 'nỉ',
  'kim loai': 'kim loại',
  kinh: 'kính',
  may: 'mây',
  nhua: 'nhựa',
  'phong khach': 'phòng khách',
  'phong ngu': 'phòng ngủ',
  'phong lam viec': 'phòng làm việc',
  'van phong': 'văn phòng',
  bep: 'bếp',
  'ban cong': 'ban công',
  'hien dai': 'hiện đại',
  'toi gian': 'tối giản',
  'co dien': 'cổ điển',
  luxury: 'luxury',
  'sang trong': 'sang trọng',
  vintage: 'vintage',
  'bac au': 'Bắc Âu',
  nho: 'nhỏ',
  lon: 'lớn',
  mini: 'mini',
  rong: 'rộng',
  cao: 'cao',
  thap: 'thấp'
};

const STOP_WORDS = new Set([
  'toi', 'can', 'muon', 'tim', 'mua', 'san', 'pham', 'cho', 'duoi', 'tren', 'tam', 'khoang',
  'gia', 'trieu', 'nghin', 'dong', 'vnd', 'mot', 'cai', 'chiec', 'va', 'hoac', 'la', 'co',
  'khong', 'tu', 'van', 'giup', 'minh', 'phong', 'nha', 'hom', 'nay', 'thoi', 'tiet', 'the', 'nao',
  'mau', 'chat', 'lieu', 'kich', 'thuoc', 'cao', 'rong', 'sau', 'kieu', 'dang'
]);

const normalizeText = (value = '') => value
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9\s\-x]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toVnd = (value, unit = '') => {
  const number = Number(value.replace(',', '.'));
  if (Number.isNaN(number)) return null;
  const normalizedUnit = normalizeText(unit);
  if (normalizedUnit.startsWith('tr')) return Math.round(number * 1000000);
  if (normalizedUnit.startsWith('nghin') || normalizedUnit === 'k') return Math.round(number * 1000);
  return Math.round(number);
};

const createBudget = ({ minPrice = null, maxPrice = null, targetPrice = null, intent = null } = {}) => ({
  minPrice,
  maxPrice,
  targetPrice,
  intent
});

const extractBudget = (message) => {
  const normalized = normalizeText(message);
  const money = '(\\d+(?:[\\.,]\\d+)?)\\s*(trieu|tr|nghin|k)';
  const parseMoney = (value, unit) => toVnd(value, unit);

  let match = normalized.match(new RegExp(`(?:tu\\s+)?${money}\\s*(?:den|toi|-)\\s*${money}`));
  if (match) {
    const minPrice = parseMoney(match[1], match[2]);
    const maxPrice = parseMoney(match[3], match[4]);
    if (minPrice !== null && maxPrice !== null) {
      return createBudget({ minPrice: Math.min(minPrice, maxPrice), maxPrice: Math.max(minPrice, maxPrice), intent: 'range' });
    }
  }

  match = normalized.match(new RegExp(`(?:tu\\s+)?(\\d+(?:[\\.,]\\d+)?)\\s*(?:den|toi|-)\\s*${money}`));
  if (match) {
    const minPrice = parseMoney(match[1], match[3]);
    const maxPrice = parseMoney(match[2], match[3]);
    if (minPrice !== null && maxPrice !== null) {
      return createBudget({ minPrice: Math.min(minPrice, maxPrice), maxPrice: Math.max(minPrice, maxPrice), intent: 'range' });
    }
  }

  match = normalized.match(new RegExp(`(?:tren|hon|lon hon)\\s*${money}`));
  if (match) {
    const minPrice = parseMoney(match[1], match[2]);
    if (minPrice !== null) return createBudget({ minPrice, intent: 'above' });
  }

  match = normalized.match(new RegExp(`tu\\s*${money}\\s*(?:tro len|do len|len)`));
  if (match) {
    const minPrice = parseMoney(match[1], match[2]);
    if (minPrice !== null) return createBudget({ minPrice, intent: 'above' });
  }

  match = normalized.match(new RegExp(`(?:duoi|nho hon|khong qua|toi da)\\s*${money}`));
  if (match) {
    const maxPrice = parseMoney(match[1], match[2]);
    if (maxPrice !== null) return createBudget({ maxPrice, intent: 'below' });
  }

  match = normalized.match(new RegExp(`(?:khoang|tam)\\s*${money}`));
  if (match) {
    const targetPrice = parseMoney(match[1], match[2]);
    if (targetPrice !== null) {
      return createBudget({
        minPrice: Math.round(targetPrice * 0.8),
        maxPrice: Math.round(targetPrice * 1.2),
        targetPrice,
        intent: 'around'
      });
    }
  }

  match = normalized.match(new RegExp(`\\b${money}\\b`));
  if (match) {
    const targetPrice = parseMoney(match[1], match[2]);
    if (targetPrice !== null) {
      return createBudget({
        minPrice: Math.round(targetPrice * 0.8),
        maxPrice: Math.round(targetPrice * 1.2),
        targetPrice,
        intent: 'around'
      });
    }
  }

  match = normalized.match(/\b(\d{6,})\s*(?:dong|vnd)?\b/);
  if (match) {
    const targetPrice = toVnd(match[1]);
    return createBudget({
      minPrice: Math.round(targetPrice * 0.8),
      maxPrice: Math.round(targetPrice * 1.2),
      targetPrice,
      intent: 'around'
    });
  }

  return createBudget();
};

const extractCategorySlug = (message) => {
  const normalized = normalizeText(message);
  return CATEGORY_ALIASES.find(category => category.terms.some(term => normalized.includes(normalizeText(term))))?.slug || null;
};

const extractKeywords = (message) => normalizeText(message)
  .split(' ')
  .filter(word => word.length >= 3 && !STOP_WORDS.has(word) && Number.isNaN(Number(word)))
  .slice(0, 8);

const extractTerms = (normalized, terms) => terms.filter(term => normalized.includes(normalizeText(term)));

const parseMeterValue = (whole, decimal = '') => {
  const main = Number(whole);
  if (!Number.isFinite(main)) return null;
  if (decimal) return Math.round((main + Number(`0.${decimal}`)) * 100);
  return Math.round(main * 100);
};

const extractAttributeIntent = (message) => {
  const normalized = normalizeText(message);
  const colors = extractTerms(normalized, ATTRIBUTE_DICTIONARY.colors);
  if (normalized.includes('mau go')) colors.push('go');

  const attributes = {
    colors,
    materials: extractTerms(normalized, ATTRIBUTE_DICTIONARY.materials),
    sizes: extractTerms(normalized, SIZE_WORDS),
    rooms: extractTerms(normalized, ATTRIBUTE_DICTIONARY.rooms),
    styles: extractTerms(normalized, ATTRIBUTE_DICTIONARY.styles),
    dimensions: {
      widthCm: null,
      heightCm: null,
      depthCm: null
    }
  };

  const dimensionMatches = [];
  for (const match of normalized.matchAll(/(\d{2,3})\s*x\s*(\d{2,3})(?:\s*x\s*(\d{2,3}))?/g)) {
    dimensionMatches.push({ values: [match[1], match[2], match[3]].filter(Boolean).map(Number), text: match[0] });
  }
  for (const match of normalized.matchAll(/(\d+)\s*m\s*(\d)?\b/g)) {
    const value = parseMeterValue(match[1], match[2] || '');
    if (value !== null) dimensionMatches.push({ values: [value], text: match[0] });
  }
  for (const match of normalized.matchAll(/(\d{2,3})\s*cm\b/g)) {
    dimensionMatches.push({ values: [Number(match[1])], text: match[0] });
  }

  dimensionMatches.forEach(({ values, text }) => {
    const index = normalized.indexOf(text);
    const prefix = index >= 0 ? normalized.slice(Math.max(0, index - 20), index) : '';
    if (prefix.includes('cao')) attributes.dimensions.heightCm = values[0];
    else if (prefix.includes('sau')) attributes.dimensions.depthCm = values[0];
    else if (prefix.includes('rong')) attributes.dimensions.widthCm = values[0];
    else if (values.length >= 2) {
      attributes.dimensions.widthCm = values[0];
      attributes.dimensions.depthCm = values[1];
      if (values[2]) attributes.dimensions.heightCm = values[2];
    } else if (!attributes.dimensions.widthCm) {
      attributes.dimensions.widthCm = values[0];
    }
  });

  return attributes;
};

const toStructuredIntent = ({ budget, categorySlug, attributes }) => ({
  intentType: categorySlug || budget.intent || hasAttributeIntent(attributes) ? 'product_recommendation' : 'unknown',
  category: categorySlug,
  budget: { min: budget.minPrice, max: budget.maxPrice, currency: 'VND' },
  room: legacyToIntent.room.get(attributes.rooms[0]) || null,
  style: legacyToIntent.style.get(attributes.styles[0]) || null,
  colors: [...new Set(attributes.colors.map((value) => legacyToIntent.color.get(value)).filter(Boolean))],
  materials: [...new Set(attributes.materials.map((value) => legacyToIntent.material.get(value)).filter(Boolean))],
  size: legacyToIntent.size.get(attributes.sizes[0]) || null,
  stockRequired: false,
  sortPreference: null,
  constraints: [],
  confidence: 0,
  missingImportantFields: [],
  ambiguousFields: []
});

const toLegacyBudget = (budget) => ({
  minPrice: budget.min,
  maxPrice: budget.max,
  targetPrice: budget.min !== null && budget.max !== null && budget.min === budget.max ? budget.min : null,
  intent: budget.min !== null && budget.max !== null ? 'range' : budget.min !== null ? 'above' : budget.max !== null ? 'below' : null
});

const toLegacyAttributes = (intent, fallbackAttributes) => ({
  ...fallbackAttributes,
  colors: intent.colors.map((value) => intentToLegacy.color.get(value)).filter(Boolean),
  materials: intent.materials.map((value) => intentToLegacy.material.get(value)).filter(Boolean),
  rooms: intent.room ? [intentToLegacy.room.get(intent.room)].filter(Boolean) : [],
  styles: intent.style ? [intentToLegacy.style.get(intent.style)].filter(Boolean) : [],
  sizes: intent.size ? [intentToLegacy.size.get(intent.size)].filter(Boolean) : []
});

const hasAttributeIntent = (attributes) => Boolean(
  attributes.colors.length ||
  attributes.materials.length ||
  attributes.sizes.length ||
  attributes.rooms.length ||
  attributes.styles.length ||
  attributes.dimensions.widthCm ||
  attributes.dimensions.heightCm ||
  attributes.dimensions.depthCm
);

const hasGeneralCatalogIntent = (message) => {
  const normalized = normalizeText(message);
  return ['noi that', 'san pham', 'tu van', 'goi y', 'mua', 'can tim', 'can mua'].some(term => normalized.includes(term));
};

const buildProductWhere = ({ message, budget, categorySlug, attributes }) => {
  const keywords = extractKeywords(message);
  const where = { isActive: true };
  if (categorySlug) where.category = { slug: categorySlug };

  if (!categorySlug && keywords.length > 0) {
    where.OR = keywords.flatMap(keyword => ([
      { name: { contains: keyword } },
      { description: { contains: keyword } },
      { category: { name: { contains: keyword } } },
      { color: { contains: keyword } },
      { material: { contains: keyword } },
      { dimensions: { contains: keyword } },
      { roomType: { contains: keyword } },
      { style: { contains: keyword } }
    ]));
  }

  return { where, keywords, hasAttributes: hasAttributeIntent(attributes) };
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

const productSearchText = (product) => normalizeText([
  product.name,
  product.description,
  product.category?.name,
  product.color,
  product.material,
  product.dimensions,
  product.roomType,
  product.style
].filter(Boolean).join(' '));

const fieldMatchesAny = (value, terms) => {
  if (!terms.length) return false;
  const normalized = normalizeText(value || '');
  return terms.some(term => normalized.includes(normalizeText(term)));
};

const textMatchesAny = (text, terms) => terms.some(term => text.includes(normalizeText(term)));

const cmMatches = (actual, expected, tolerance = 10) => {
  const value = Number(actual);
  return Number.isFinite(value) && Math.abs(value - expected) <= tolerance;
};

const dimensionTextMatches = (product, expected) => {
  const text = productSearchText(product);
  const variants = [String(expected), `${expected}cm`];
  if (expected % 100 === 0) variants.push(`${expected / 100}m`);
  const meters = expected / 100;
  if (!Number.isInteger(meters)) variants.push(`${String(meters).replace('.', 'm')}`);
  return variants.some(variant => text.includes(normalizeText(variant)));
};

const getAttributeMatch = (product, attributes) => {
  const text = productSearchText(product);
  const color = !attributes.colors.length || fieldMatchesAny(product.color, attributes.colors) || textMatchesAny(text, attributes.colors);
  const material = !attributes.materials.length || fieldMatchesAny(product.material, attributes.materials) || textMatchesAny(text, attributes.materials);
  const room = !attributes.rooms.length || fieldMatchesAny(product.roomType, attributes.rooms) || textMatchesAny(text, attributes.rooms);
  const style = !attributes.styles.length || fieldMatchesAny(product.style, attributes.styles) || textMatchesAny(text, attributes.styles);
  const width = !attributes.dimensions.widthCm || cmMatches(product.widthCm, attributes.dimensions.widthCm) || dimensionTextMatches(product, attributes.dimensions.widthCm);
  const height = !attributes.dimensions.heightCm || cmMatches(product.heightCm, attributes.dimensions.heightCm) || dimensionTextMatches(product, attributes.dimensions.heightCm);
  const depth = !attributes.dimensions.depthCm || cmMatches(product.depthCm, attributes.dimensions.depthCm) || dimensionTextMatches(product, attributes.dimensions.depthCm);
  const sizeWord = !attributes.sizes.length || textMatchesAny(text, attributes.sizes);

  return {
    color,
    material,
    room,
    style,
    width,
    height,
    depth,
    sizeWord,
    exact: color && material && room && style && width && height && depth,
    hasSoftSizeMatch: sizeWord
  };
};

const getAttributeScore = (product, attributes) => {
  const text = productSearchText(product);
  let score = 0;

  attributes.colors.forEach(term => {
    if (fieldMatchesAny(product.color, [term])) score += 20;
    else if (text.includes(normalizeText(term))) score += 10;
  });
  attributes.materials.forEach(term => {
    if (fieldMatchesAny(product.material, [term])) score += 20;
    else if (text.includes(normalizeText(term))) score += 10;
  });
  attributes.rooms.forEach(term => {
    if (fieldMatchesAny(product.roomType, [term])) score += 18;
    else if (text.includes(normalizeText(term))) score += 8;
  });
  attributes.styles.forEach(term => {
    if (fieldMatchesAny(product.style, [term])) score += 16;
    else if (text.includes(normalizeText(term))) score += 8;
  });
  attributes.sizes.forEach(term => {
    if (text.includes(normalizeText(term))) score += 5;
  });
  Object.entries(attributes.dimensions).forEach(([field, expected]) => {
    if (!expected) return;
    if (cmMatches(product[field], expected)) score += 25;
    else if (dimensionTextMatches(product, expected)) score += 14;
  });

  return score;
};

const getEffectivePrice = (product) => Number(product.finalPrice ?? product.displayPrice ?? product.price ?? 0);

const getOriginalPrice = (product) => Number(product.originalPrice ?? product.price ?? 0);

const hasActivePromotion = (product) => Boolean(product.hasPromotion && getEffectivePrice(product) < getOriginalPrice(product));

const formatVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đồng`;

const getPricingSummary = (product) => {
  const originalPrice = getOriginalPrice(product);
  const finalPrice = getEffectivePrice(product);
  const discountAmount = Number(product.discountAmount ?? Math.max(originalPrice - finalPrice, 0));
  const discountPercent = Number(product.discountPercent ?? (originalPrice > 0 ? Math.round(discountAmount / originalPrice * 100) : 0));

  if (!hasActivePromotion(product)) {
    return `Giá hiện tại: ${formatVnd(finalPrice)}.`;
  }

  const promotionName = product.promotion?.name ? ` Chương trình: ${product.promotion.name}.` : '';
  return `Giá gốc: ${formatVnd(originalPrice)}. Giá sau khuyến mãi: ${formatVnd(finalPrice)}. Tiết kiệm: ${formatVnd(discountAmount)}${discountPercent > 0 ? ` (-${discountPercent}%)` : ''}.${promotionName}`;
};

const budgetMatches = (product, budget) => {
  const effectivePrice = getEffectivePrice(product);
  if (budget.minPrice !== null && effectivePrice < budget.minPrice) return false;
  if (budget.maxPrice !== null && effectivePrice > budget.maxPrice) return false;
  return true;
};

const scoreProduct = ({ product, normalizedMessage, keywords, budget, categorySlug, currentProduct, attributes }) => {
  const haystack = productSearchText(product);
  let score = 0;

  if (product.stock > 0) score += 30;
  if (categorySlug && product.category?.slug === categorySlug) score += 25;
  if (budget.intent && budgetMatches(product, budget)) score += 20;
  if (currentProduct?.categoryId && product.categoryId === currentProduct.categoryId) score += 8;

  keywords.forEach(keyword => {
    if (haystack.includes(keyword)) score += 7;
  });

  score += getAttributeScore(product, attributes);

  if (normalizedMessage.includes('re') || normalizedMessage.includes('tiet kiem')) {
    score += Math.max(0, 10 - getEffectivePrice(product) / 1000000);
  }

  score += Math.min(product.reviewCount || 0, 10);
  return score;
};

const serializeRecommendation = (product, reason = '') => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  price: getEffectivePrice(product),
  originalPrice: getOriginalPrice(product),
  finalPrice: getEffectivePrice(product),
  displayPrice: product.displayPrice ?? getEffectivePrice(product),
  discountAmount: Number(product.discountAmount ?? Math.max(getOriginalPrice(product) - getEffectivePrice(product), 0)),
  discountPercent: Number(product.discountPercent ?? 0),
  hasPromotion: hasActivePromotion(product),
  promotion: product.promotion || null,
  imageUrl: getPrimaryImageUrl(product),
  stock: product.stock,
  category: product.category?.name || null,
  averageRating: product.averageRating || 0,
  reviewCount: product.reviewCount || 0,
  color: product.color || null,
  material: product.material || null,
  dimensions: product.dimensions || null,
  widthCm: product.widthCm ?? null,
  heightCm: product.heightCm ?? null,
  depthCm: product.depthCm ?? null,
  roomType: product.roomType || null,
  style: product.style || null,
  attributeSnippet: [
    product.color ? `Màu: ${product.color}` : '',
    product.material ? `Chất liệu: ${product.material}` : '',
    product.dimensions ? `Kích thước: ${product.dimensions}` : '',
    product.roomType ? `Phòng: ${product.roomType}` : '',
    product.style ? `Phong cách: ${product.style}` : '',
    product.description ? String(product.description).slice(0, 220) : ''
  ].filter(Boolean).join('; '),
  reason
});

const buildAttributeReasonParts = (product, attributes) => {
  const parts = [];
  if (attributes.colors.length && fieldMatchesAny(product.color, attributes.colors)) parts.push(`màu ${product.color}`);
  if (attributes.materials.length && fieldMatchesAny(product.material, attributes.materials)) parts.push(`chất liệu ${product.material}`);
  if (attributes.rooms.length && fieldMatchesAny(product.roomType, attributes.rooms)) parts.push(`phù hợp ${product.roomType}`);
  if (attributes.styles.length && fieldMatchesAny(product.style, attributes.styles)) parts.push(`phong cách ${product.style}`);
  if (attributes.dimensions.widthCm && product.widthCm) parts.push(`rộng ${product.widthCm} cm`);
  if (attributes.dimensions.heightCm && product.heightCm) parts.push(`cao ${product.heightCm} cm`);
  if (attributes.dimensions.depthCm && product.depthCm) parts.push(`sâu ${product.depthCm} cm`);
  return parts;
};

const buildRuleBasedReason = ({ product, budget, categorySlug, attributes }) => {
  const parts = [];
  if (categorySlug && product.category?.slug === categorySlug) parts.push(`thuộc danh mục ${product.category.name}`);
  if (budget.intent && budgetMatches(product, budget)) parts.push(hasActivePromotion(product) ? 'đúng khoảng giá bạn yêu cầu nhờ giá khuyến mãi hiện tại' : 'đúng khoảng giá bạn yêu cầu');
  if (hasActivePromotion(product)) parts.push(`đang giảm còn ${formatVnd(getEffectivePrice(product))}`);
  parts.push(...buildAttributeReasonParts(product, attributes));
  if (product.stock > 0) parts.push(`còn ${product.stock} sản phẩm`);
  if ((product.averageRating || 0) > 0) parts.push(`được đánh giá ${product.averageRating}/5`);
  return parts.length > 0 ? `Phù hợp vì ${parts.join(', ')}.` : 'Phù hợp với nhu cầu tìm kiếm của bạn.';
};

const describeBudget = (budget) => {
  if (!budget.intent) return '';
  if (budget.intent === 'above') return ` trên ${budget.minPrice.toLocaleString('vi-VN')} đồng`;
  if (budget.intent === 'below') return ` dưới ${budget.maxPrice.toLocaleString('vi-VN')} đồng`;
  if (budget.intent === 'range') return ` từ ${budget.minPrice.toLocaleString('vi-VN')} đến ${budget.maxPrice.toLocaleString('vi-VN')} đồng`;
  return ` quanh ${budget.targetPrice.toLocaleString('vi-VN')} đồng`;
};

const displayTerms = (terms) => terms.map(term => TERM_LABELS[term] || term).join(', ');

const describeAttributes = (attributes) => {
  const parts = [];
  if (attributes.colors.length) parts.push(`màu ${displayTerms(attributes.colors)}`);
  if (attributes.materials.length) parts.push(`chất liệu ${displayTerms(attributes.materials)}`);
  if (attributes.rooms.length) parts.push(`cho ${displayTerms(attributes.rooms)}`);
  if (attributes.styles.length) parts.push(`phong cách ${displayTerms(attributes.styles)}`);
  if (attributes.dimensions.widthCm) parts.push(`rộng khoảng ${attributes.dimensions.widthCm} cm`);
  if (attributes.dimensions.heightCm) parts.push(`cao khoảng ${attributes.dimensions.heightCm} cm`);
  if (attributes.dimensions.depthCm) parts.push(`sâu khoảng ${attributes.dimensions.depthCm} cm`);
  if (attributes.sizes.length) parts.push(`kích thước ${displayTerms(attributes.sizes)}`);
  return parts.join(', ');
};

const buildRuleBasedAnswer = ({ recommendations, budget, categorySlug, attributes, noExactAttributeMatch = false }) => {
  const attributeText = describeAttributes(attributes);
  if (recommendations.length === 0) {
    if (noExactAttributeMatch && attributeText) {
      return `Hiện mình chưa tìm thấy sản phẩm khớp hoàn toàn với tiêu chí ${attributeText}${describeBudget(budget)}. Một số sản phẩm có thể chưa được cập nhật đầy đủ màu sắc, chất liệu hoặc kích thước.`;
    }
    return 'Mình chưa tìm thấy sản phẩm phù hợp trong danh mục đang bán. Bạn có thể nói rõ hơn về loại sản phẩm, ngân sách hoặc không gian cần bố trí.';
  }

  const categoryText = categorySlug ? ' theo đúng danh mục bạn quan tâm' : '';
  const budgetText = describeBudget(budget);
  const attributeSuffix = attributeText ? ` và tiêu chí ${attributeText}` : '';
  const topNames = recommendations.slice(0, 3).map(item => item.name).join(', ');
  return `Mình tìm thấy ${recommendations.length} gợi ý${categoryText}${budgetText}${attributeSuffix}. Nổi bật nhất là: ${topNames}. Các gợi ý này đều lấy từ sản phẩm đang bán trong hệ thống.`;
};

const buildCatalogForPrompt = (recommendations, groundedFacts = new Map()) => recommendations.map(item => ({
  id: item.id,
  name: item.name,
  price: item.finalPrice ?? item.price,
  originalPrice: item.originalPrice ?? item.price,
  finalPrice: item.finalPrice ?? item.price,
  displayPrice: item.displayPrice ?? item.finalPrice ?? item.price,
  discountAmount: item.discountAmount ?? 0,
  discountPercent: item.discountPercent ?? 0,
  hasPromotion: item.hasPromotion || false,
  promotionActive: item.hasPromotion === true,
  category: item.category,
  averageRating: item.averageRating,
  reviewCount: item.reviewCount,
  color: item.color,
  material: item.material,
  dimensions: item.dimensions,
  widthCm: item.widthCm,
  heightCm: item.heightCm,
  depthCm: item.depthCm,
  roomType: item.roomType,
  style: item.style,
  groundedReasons: groundedFacts.get(item.id) || { reasonCodes: [], facts: {} }
}));

const extractJsonObject = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return trimmed.slice(start, end + 1);
};

const buildGeminiPrompt = ({ message, recommendations, groundedFacts = new Map() }) => JSON.stringify({
  role: 'AI Sales Advisor for FurnitureEcommerce',
  instructions: [
    'Trả lời bằng tiếng Việt có dấu.',
    'Giọng tư vấn thân thiện, ngắn gọn, hữu ích.',
    'Chỉ tư vấn dựa trên allowedProducts do backend cung cấp.',
    'Không bịa sản phẩm, giá, tồn kho, khuyến mãi, chính sách hoặc thông tin ngoài allowedProducts.',
    'Không đổi product ID, thứ tự sản phẩm, giá, tồn kho hoặc khuyến mãi.',
    'Mỗi usedReasonCodes phải là mã có trong groundedReasons của đúng sản phẩm; chỉ diễn đạt mã đã cấp.',
    'Không đưa số liệu, HTML hoặc trường ngoài responseFormat vào reason text.',
    'Chỉ trả về JSON hợp lệ, không markdown, không giải thích ngoài JSON.',
    'Use finalPrice as the current selling price. If hasPromotion=true, mention the discounted finalPrice, originalPrice, discountAmount, discountPercent and promotion when useful.',
    'Never treat originalPrice as the current selling price when finalPrice is lower.',
  ],
  customerMessage: message,
  allowedProducts: buildCatalogForPrompt(recommendations, groundedFacts),
  responseFormat: {
    answer: 'string',
    reasons: [{ productId: 'number', text: 'string', usedReasonCodes: ['string'] }]
  }
});

const GEMINI_TIMEOUT_MS = 8_000;
const GEMINI_MAX_ATTEMPTS = 2;
const waitForGeminiRetry = () => new Promise((resolve) => setTimeout(resolve, 200));
const isTransientGeminiStatus = (status) => status === 408 || status === 429 || status >= 500;

export const callGemini = async ({ message, recommendations, groundedFacts = new Map(), fetchImpl = fetch, telemetry = aiTelemetry, telemetryContext = {} }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || recommendations.length === 0) {
    telemetry.emit('ai_provider_fallback', { ...telemetryContext, outcome: 'provider_fallback_success', metadata: { provider: 'gemini', model: telemetryModel(DEFAULT_MODEL), providerOperation: 'writer', errorCode: 'validation_error', fallbackUsed: true } });
    return null;
  }

  const model = encodeURIComponent(DEFAULT_MODEL);
  let lastError;
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    const startedAt = process.hrtime.bigint();
    let attemptRecorded = false;
    try {
      const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: buildGeminiPrompt({ message, recommendations, groundedFacts }) }] }], generationConfig: { temperature: 0.4, responseMimeType: 'application/json' } })
      });
      if (!response.ok) {
        const error = Object.assign(new Error(`Gemini request failed with status ${response.status}`), { status: response.status });
        telemetry.emit('ai_provider_attempt', { ...telemetryContext, durationMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n), metadata: { provider: 'gemini', model: telemetryModel(DEFAULT_MODEL), providerOperation: 'writer', attempt, httpStatus: response.status } }); attemptRecorded = true;
        if (!isTransientGeminiStatus(response.status) || attempt === GEMINI_MAX_ATTEMPTS) throw error;
        logger.warn('gemini_request_retry', { reason: `http_${response.status}` });
        await waitForGeminiRetry();
        continue;
      }
      logger.info('gemini_request_completed', { durationMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n) });
      telemetry.emit('ai_provider_attempt', { ...telemetryContext, durationMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n), metadata: { provider: 'gemini', model: telemetryModel(DEFAULT_MODEL), providerOperation: 'writer', attempt } }); attemptRecorded = true;
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
      const jsonText = extractJsonObject(content);
      if (!jsonText) {
        telemetry.emit('ai_provider_fallback', { ...telemetryContext, outcome: 'provider_fallback_success', metadata: { provider: 'gemini', model: telemetryModel(DEFAULT_MODEL), providerOperation: 'writer', errorCode: 'provider_invalid_output', fallbackUsed: true } });
        return null;
      }
      return JSON.parse(jsonText);
    } catch (error) {
      lastError = error;
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      if (!attemptRecorded) telemetry.emit('ai_provider_attempt', { ...telemetryContext, durationMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n), metadata: { provider: 'gemini', model: telemetryModel(DEFAULT_MODEL), providerOperation: 'writer', attempt, ...(Number.isInteger(error?.status) ? { httpStatus: error.status } : {}), timeout } });
      if (attempt < GEMINI_MAX_ATTEMPTS && (timeout || isTransientGeminiStatus(error?.status))) {
        logger.warn('gemini_request_retry', { reason: timeout ? 'timeout' : `http_${error.status}` });
        await waitForGeminiRetry();
        continue;
      }
      logger.warn('gemini_request_failed', { reason: timeout ? 'timeout' : 'upstream_failure' }, error);
      telemetry.emit('ai_provider_failed', { ...telemetryContext, metadata: { provider: 'gemini', model: telemetryModel(DEFAULT_MODEL), providerOperation: 'writer', errorCode: classifyAiTelemetryError(error), ...(Number.isInteger(error?.status) ? { httpStatus: error.status } : {}), timeout } });
      throw error;
    }
  }
  throw lastError;
};

const fetchProducts = (where) => prisma.product.findMany({
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

export const resolveAdvisorIntent = async ({ message, context = {}, telemetry = aiTelemetry, telemetryContext = {} }) => {
  const fallbackBudget = extractBudget(message);
  const fallbackCategorySlug = extractCategorySlug(message);
  const fallbackAttributes = extractAttributeIntent(message);
  const fallbackIntent = toStructuredIntent({ budget: fallbackBudget, categorySlug: fallbackCategorySlug, attributes: fallbackAttributes });
  const currentProductId = Number(context.currentProductId);
  const { intent, source } = await extractStructuredIntent({
    message,
    currentProductId: Number.isInteger(currentProductId) && currentProductId > 0 ? currentProductId : undefined,
    fallbackIntent, telemetry, telemetryContext
  });
  return { intent, source, fallbackBudget, fallbackCategorySlug, fallbackAttributes };
};

const compareNumber = (left, right, direction = 'asc') => {
  const a = Number.isFinite(Number(left)) ? Number(left) : 0;
  const b = Number.isFinite(Number(right)) ? Number(right) : 0;
  return direction === 'desc' ? b - a : a - b;
};

const compareRankedCandidates = (left, right, sortPreference = null) => {
  const price = (direction = 'asc') => compareNumber(getEffectivePrice(left.product), getEffectivePrice(right.product), direction);
  const score = () => compareNumber(left.score, right.score, 'desc');
  const inStock = () => compareNumber(Number(left.product.stock) > 0, Number(right.product.stock) > 0, 'desc');
  const rating = () => compareNumber(left.product.averageRating, right.product.averageRating, 'desc');
  const reviewCount = () => compareNumber(left.product.reviewCount, right.product.reviewCount, 'desc');
  const newest = () => compareNumber(new Date(left.product.createdAt || 0).getTime(), new Date(right.product.createdAt || 0).getTime(), 'desc');
  const sequences = {
    price_asc: [price, score, inStock, rating, reviewCount],
    price_desc: [() => price('desc'), score, inStock, rating, reviewCount],
    rating_desc: [rating, score, inStock, price, reviewCount],
    newest: [newest, score, inStock, price, rating, reviewCount],
    relevance: [score, inStock, price, rating, reviewCount]
  };
  for (const comparator of sequences[sortPreference] || sequences.relevance) {
    const result = comparator();
    if (result !== 0) return result;
  }
  return compareNumber(left.product.id, right.product.id, 'asc');
};

const defaultStage1Dependencies = Object.freeze({
  findCurrentProduct: (id) => prisma.product.findFirst({ where: { id, isActive: true } }),
  retrieveCandidates: retrieveAdvisorCandidates,
  enrichCandidatePromotions: attachPricingToProducts,
  applyCandidateEligibility: (input) => applyCandidateEligibility({ ...input, budgetMatches, getAttributeMatch })
});

export const prepareAdvisorCandidates = async ({ message, context = {}, resolvedIntent = null, excluded = {}, fieldMeta = {}, operations = {}, comparativeState = null, lastRecommendationContext = {}, telemetry = aiTelemetry, telemetryContext = {} }, dependencies = defaultStage1Dependencies) => {
  const currentProductId = Number(context.currentProductId);
  const resolution = resolvedIntent || await resolveAdvisorIntent({ message, context, telemetry, telemetryContext });
  const { intent, source, fallbackBudget, fallbackCategorySlug, fallbackAttributes } = resolution;
  const budget = source === 'fallback' ? fallbackBudget : toLegacyBudget(intent.budget);
  const categorySlug = source === 'fallback' ? fallbackCategorySlug : intent.category;
  const attributes = source === 'fallback' ? fallbackAttributes : toLegacyAttributes(intent, fallbackAttributes);
  const classification = classifyAdvisorConstraints({ intent, fieldMeta, operations, excluded });
  const hardAttributes = {
    colors: classification.hard.colors.map((value) => intentToLegacy.color.get(value)).filter(Boolean),
    materials: classification.hard.materials.map((value) => intentToLegacy.material.get(value)).filter(Boolean),
    rooms: classification.hard.room ? [intentToLegacy.room.get(classification.hard.room)].filter(Boolean) : [],
    styles: classification.hard.style ? [intentToLegacy.style.get(classification.hard.style)].filter(Boolean) : [],
    sizes: classification.hard.size ? [intentToLegacy.size.get(classification.hard.size)].filter(Boolean) : [],
    dimensions: { widthCm: null, heightCm: null, depthCm: null }
  };
  const hasHardAttributes = hasAttributeIntent(hardAttributes);
  const normalizedMessage = normalizeText(message);
  const { where, keywords } = buildProductWhere({ message, budget, categorySlug, attributes: hardAttributes });

  if (!budget.intent && !categorySlug && keywords.length === 0 && !hasHardAttributes && !hasGeneralCatalogIntent(message)) {
    return { intent, retrieval: { candidates: [], metadata: { primaryCount: 0, retrievedCount: 0, fallbackUsed: false, fallbackReason: 'none' } }, enrichment: { candidates: [] }, eligibility: { candidates: [], diagnostics: { beforeBudgetCount: 0, afterBudgetCount: 0, beforeAttributeCount: 0, afterAttributeCount: 0, beforeExclusionCount: 0, afterExclusionCount: 0, beforeStockCount: 0, afterStockCount: 0, exclusionApplied: classification.hard.exclusions.categories.length + classification.hard.exclusions.colors.length + classification.hard.exclusions.materials.length + classification.hard.exclusions.styles.length > 0, stockRequired: classification.hard.stockRequired } }, stageContext: { message, normalizedMessage, keywords, budget, categorySlug, attributes, hardAttributes, hasHardAttributes, classification, currentProduct: null, noExactAttributeMatch: false, immediateEmpty: true, telemetry, telemetryContext } };
  }

  const currentProduct = Number.isInteger(currentProductId) && currentProductId > 0
    ? await dependencies.findCurrentProduct(currentProductId)
    : null;

  const retrieval = await dependencies.retrieveCandidates({ fetchProducts, primaryWhere: where, categorySlug, budget, hasAttributes: hasHardAttributes });
  const products = retrieval.candidates;

  const enrichedProducts = await dependencies.enrichCandidatePromotions(products);
  const eligibility = dependencies.applyCandidateEligibility({ candidates: enrichedProducts, budget, attributes: hardAttributes, hasAttributes: hasHardAttributes, excluded: classification.hard.exclusions, stockRequired: classification.hard.stockRequired, classification });
  const comparativePolicy = buildComparativePolicy({ comparativeState: comparativeState || { type: 'none', reference: { source: 'none', productId: null, productIds: [], ordinal: null, category: null, minPrice: null, maxPrice: null, colors: [], materials: [], style: null, size: null }, confidence: 1, ambiguous: false, missingReference: false }, productPrices: lastRecommendationContext.productPrices || [], currentProduct });
  const comparative = applyComparativeEligibility({ candidates: eligibility.candidates, policy: comparativePolicy });
  return { intent, retrieval, enrichment: { candidates: enrichedProducts }, eligibility: { candidates: comparative.candidates, diagnostics: { ...eligibility.diagnostics, ...comparative.diagnostics } }, stageContext: { message, normalizedMessage, keywords, budget, categorySlug, attributes, hardAttributes, hasHardAttributes, classification, currentProduct, comparativePolicy, noExactAttributeMatch: eligibility.noExactAttributeMatch, telemetry, telemetryContext } };
};

const defaultStage2Dependencies = Object.freeze({
  aggregateCandidateReviews: getReviewSummaries,
  rankAdvisorCandidates: ({ candidates, stageContext }) => candidates.map(product => ({ product, score: scoreProduct({ product, normalizedMessage: stageContext.normalizedMessage, keywords: stageContext.keywords, budget: stageContext.budget, categorySlug: stageContext.categorySlug, currentProduct: stageContext.currentProduct, attributes: stageContext.attributes }) + scoreComparativePreferences(product, stageContext.comparativePolicy) })).sort((a, b) => compareRankedCandidates(a, b, stageContext.classification?.soft.sortPreference)),
  selectAdvisorCandidates: (ranked) => ranked,
  diversifyCandidates: diversifyRecommendations,
  buildGroundedReasons: buildRecommendationReasons,
  writeAdvisorResponse: callGemini,
  validateWriterOutput: validateGroundedWriterOutput
});

export const completeAdvisorRecommendation = async (prepared, dependencies = defaultStage2Dependencies) => {
  const { message, normalizedMessage, keywords, budget, categorySlug, attributes, hardAttributes = attributes, hasHardAttributes = false, currentProduct, noExactAttributeMatch, immediateEmpty } = prepared.stageContext;
  if (immediateEmpty) return { answer: buildRuleBasedAnswer({ recommendations: [], budget, categorySlug, attributes }), recommendations: [], mode: 'rule-based' };
  const summaryMap = await dependencies.aggregateCandidateReviews(prepared.eligibility.candidates.map(product => product.id));
  const candidates = prepared.eligibility.candidates.map(product => ({ ...product, averageRating: summaryMap.get(product.id)?.averageRating || 0, reviewCount: summaryMap.get(product.id)?.reviewCount || 0 }));
  const rankedWithScore = dependencies.rankAdvisorCandidates({ candidates, stageContext: prepared.stageContext });

  const selectableCandidates = dependencies.selectAdvisorCandidates(rankedWithScore);
  const diversification = dependencies.diversifyCandidates({ rankedCandidates: selectableCandidates, limit: MAX_RECOMMENDATIONS, context: { category: categorySlug, softPreferences: prepared.stageContext.classification?.soft || {}, comparativeType: prepared.stageContext.comparativePolicy?.type || null, sortPreference: prepared.stageContext.classification?.soft.sortPreference || 'relevance' } });
  const rankedProducts = diversification.selectedCandidates;
  const groundedFacts = dependencies.buildGroundedReasons({ candidates: rankedProducts, stageContext: prepared.stageContext });
  const fallbackReasons = deterministicReasonMap(groundedFacts);

  let recommendations = rankedProducts.map(product => serializeRecommendation(product, fallbackReasons.get(product.id) || buildRuleBasedReason({ product, budget, categorySlug, attributes })));
  recommendations = recommendations.filter(item => budgetMatches(item, budget));

  if (hasHardAttributes && recommendations.length > 0) {
    const exactRecommendations = recommendations.filter(item => getAttributeMatch(item, hardAttributes).exact);
    if (exactRecommendations.length > 0) recommendations = exactRecommendations;
  }

  let answer = buildRuleBasedAnswer({ recommendations, budget, categorySlug, attributes, noExactAttributeMatch });
  let mode = 'rule-based';

  try {
    const aiResult = await dependencies.writeAdvisorResponse({ message, recommendations, groundedFacts, telemetry: prepared.stageContext.telemetry || aiTelemetry, telemetryContext: prepared.stageContext.telemetryContext || {} });
    if (aiResult) {
      const validated = dependencies.validateWriterOutput(aiResult, { orderedIds: recommendations.map((item) => item.id), allowedFacts: groundedFacts });
      if (validated) {
      mode = 'gemini';
      answer = validated.answer;
      recommendations = recommendations.map(item => ({
        ...item,
        reason: validated.reasonMap.get(item.id) || item.reason
      }));
      } else (prepared.stageContext.telemetry || aiTelemetry).emit('ai_provider_fallback', { ...(prepared.stageContext.telemetryContext || {}), outcome: 'provider_fallback_success', metadata: { provider: 'gemini', model: telemetryModel(DEFAULT_MODEL), providerOperation: 'writer', errorCode: 'provider_invalid_output', fallbackUsed: true, writerFallbackUsed: true } });
    }
  } catch (error) {
    console.error('AI advisor Gemini fallback:', error.message);
    (prepared.stageContext.telemetry || aiTelemetry).emit('ai_provider_fallback', { ...(prepared.stageContext.telemetryContext || {}), outcome: 'provider_fallback_success', metadata: { provider: 'gemini', model: telemetryModel(DEFAULT_MODEL), providerOperation: 'writer', errorCode: classifyAiTelemetryError(error), fallbackUsed: true, writerFallbackUsed: true } });
  }

  return { answer, recommendations, mode, rankedCandidates: rankedWithScore.map(item => item.product), selectedCandidates: rankedProducts, diversification: diversification.diagnostics, groundedFacts };
};

export const getAdvisorPipelineArtifacts = async (input) => { const prepared = await prepareAdvisorCandidates(input); const recommendation = await completeAdvisorRecommendation(prepared); return { ...prepared, recommendation }; };

export const getAdvisorResponse = async (input) => {
  const artifacts = await getAdvisorPipelineArtifacts(input);
  return { answer: artifacts.recommendation.answer, recommendations: artifacts.recommendation.recommendations, mode: artifacts.recommendation.mode };
};

// Pure characterization seam: exposes existing deterministic helpers to the
// node:test suite without changing the advisor request path or its output.
export const aiAdvisorCharacterization = {
  normalizeText,
  extractBudget,
  extractCategorySlug,
  extractAttributeIntent,
  toLegacyBudget,
  toLegacyAttributes,
  buildProductWhere,
  getAttributeMatch,
  scoreProduct,
  compareRankedCandidates,
  serializeRecommendation,
  buildRuleBasedAnswer,
  buildGeminiPrompt,
  extractJsonObject,
  budgetMatches
};
