import prisma from '../prismaClient.js';

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

const buildPriceWhere = (budget) => {
  const price = {};
  if (budget.minPrice !== null) price.gte = budget.minPrice;
  if (budget.maxPrice !== null) price.lte = budget.maxPrice;
  return Object.keys(price).length > 0 ? price : null;
};

const buildProductWhere = ({ message, budget, categorySlug, attributes }) => {
  const keywords = extractKeywords(message);
  const where = { isActive: true };
  const priceWhere = buildPriceWhere(budget);

  if (priceWhere) where.price = priceWhere;
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

const budgetMatches = (product, budget) => {
  if (budget.minPrice !== null && product.price < budget.minPrice) return false;
  if (budget.maxPrice !== null && product.price > budget.maxPrice) return false;
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
  if (budget.intent && budgetMatches(product, budget)) parts.push('đúng khoảng giá bạn yêu cầu');
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

const buildCatalogForPrompt = (recommendations) => recommendations.map(item => ({
  id: item.id,
  name: item.name,
  price: item.price,
  stock: item.stock,
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
  shortDescription: item.attributeSnippet || [
    item.color ? `Màu: ${item.color}` : '',
    item.material ? `Chất liệu: ${item.material}` : '',
    item.dimensions ? `Kích thước: ${item.dimensions}` : '',
    item.roomType ? `Phòng: ${item.roomType}` : '',
    item.style ? `Phong cách: ${item.style}` : ''
  ].filter(Boolean).join('; ')
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
    'Chỉ nói màu sắc, kích thước, chất liệu, phòng phù hợp hoặc phong cách nếu field tương ứng hoặc shortDescription có dữ liệu.',
    'Nếu thiếu dữ liệu thuộc tính, hãy nói rõ: Hiện thông tin này chưa được cập nhật đầy đủ.',
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

export const getAdvisorResponse = async ({ message, context = {} }) => {
  const budget = extractBudget(message);
  const categorySlug = extractCategorySlug(message);
  const attributes = extractAttributeIntent(message);
  const normalizedMessage = normalizeText(message);
  const { where, keywords, hasAttributes } = buildProductWhere({ message, budget, categorySlug, attributes });

  if (!budget.intent && !categorySlug && keywords.length === 0 && !hasAttributes && !hasGeneralCatalogIntent(message)) {
    return {
      answer: buildRuleBasedAnswer({ recommendations: [], budget, categorySlug, attributes }),
      recommendations: [],
      mode: 'rule-based'
    };
  }

  const currentProductId = Number(context.currentProductId);
  const currentProduct = Number.isInteger(currentProductId) && currentProductId > 0
    ? await prisma.product.findFirst({ where: { id: currentProductId, isActive: true } })
    : null;

  let products = await fetchProducts(where);

  if (products.length === 0 && categorySlug) {
    products = await fetchProducts({
      isActive: true,
      category: { slug: categorySlug },
      ...(buildPriceWhere(budget) ? { price: buildPriceWhere(budget) } : {})
    });
  }

  if (products.length === 0 && budget.intent && !categorySlug) {
    products = await fetchProducts({
      isActive: true,
      price: buildPriceWhere(budget)
    });
  }

  if (products.length === 0 && hasAttributes) {
    products = await fetchProducts({
      isActive: true,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(buildPriceWhere(budget) ? { price: buildPriceWhere(budget) } : {})
    });
  }

  const summaryMap = await getReviewSummaries(products.map(product => product.id));
  const enrichedProducts = products.map(product => ({
    ...product,
    averageRating: summaryMap.get(product.id)?.averageRating || 0,
    reviewCount: summaryMap.get(product.id)?.reviewCount || 0
  }));

  const budgetFilteredProducts = enrichedProducts.filter(product => budgetMatches(product, budget));
  const productsForRanking = budget.intent ? budgetFilteredProducts : enrichedProducts;
  const rankedWithScore = productsForRanking
    .map(product => ({
      product,
      score: scoreProduct({ product, normalizedMessage, keywords, budget, categorySlug, currentProduct, attributes }),
      attributeMatch: getAttributeMatch(product, attributes)
    }))
    .sort((a, b) => b.score - a.score || b.product.stock - a.product.stock || a.product.price - b.product.price);

  let noExactAttributeMatch = false;
  let rankedProducts = rankedWithScore;
  if (hasAttributes) {
    const exactMatches = rankedWithScore.filter(item => item.attributeMatch.exact);
    if (exactMatches.length > 0) {
      rankedProducts = exactMatches;
    } else if (attributes.colors.length || attributes.materials.length || attributes.rooms.length || attributes.styles.length || attributes.dimensions.widthCm || attributes.dimensions.heightCm || attributes.dimensions.depthCm) {
      rankedProducts = [];
      noExactAttributeMatch = true;
    }
  }

  rankedProducts = rankedProducts
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ product }) => product);

  let recommendations = rankedProducts.map(product => serializeRecommendation(product, buildRuleBasedReason({ product, budget, categorySlug, attributes })));
  recommendations = recommendations.filter(item => budgetMatches(item, budget));

  if (hasAttributes && recommendations.length > 0) {
    const exactRecommendations = recommendations.filter(item => getAttributeMatch(item, attributes).exact);
    if (exactRecommendations.length > 0) recommendations = exactRecommendations;
  }

  let answer = buildRuleBasedAnswer({ recommendations, budget, categorySlug, attributes, noExactAttributeMatch });
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
