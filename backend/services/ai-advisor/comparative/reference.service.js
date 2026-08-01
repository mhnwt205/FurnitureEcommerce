import { comparativeIntentSchema } from './comparative.schema.js';
import { AI_CATEGORIES, AI_COLORS, AI_SIZES } from '../intent/intent.taxonomy.js';

const canonical = (values, allowed) => [...new Set(Array.isArray(values) ? values : [])].filter((value) => allowed.includes(value)).slice(0, 5);
const ids = (values) => [...new Set(Array.isArray(values) ? values : [])].filter((value) => Number.isInteger(value) && value > 0).slice(0, 5);
const normalizeCategory = (value) => {
  if (AI_CATEGORIES.includes(value)) return value;
  const normalized = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
  const aliases = { sofa: 'sofa', ban: 'ban', ghe: 'ghe', giuong: 'giuong', tu: 'tu', den: 'den' };
  return aliases[normalized] || null;
};

const referenceContext = (context = {}) => ({
  productIds: ids(context.productIds), category: normalizeCategory(context.category),
  minPrice: Number.isInteger(context.minPrice) && context.minPrice >= 0 ? context.minPrice : null,
  maxPrice: Number.isInteger(context.maxPrice) && context.maxPrice >= 0 ? context.maxPrice : null,
  colors: canonical(context.dominantColors, AI_COLORS), size: AI_SIZES.includes(context.dominantSize) ? context.dominantSize : null
});

export const resolveComparativeReference = ({ signal, lastRecommendationContext = {}, currentProductId = null, message = '' }) => {
  const context = referenceContext(lastRecommendationContext);
  const currentId = Number.isInteger(Number(currentProductId)) && Number(currentProductId) > 0 ? Number(currentProductId) : null;
  const text = String(message).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  let source = 'none'; let productId = null; let productIds = []; let ordinal = signal.ordinal || null; let ambiguous = signal.ambiguous === true;
  if (signal.type === 'none') return comparativeIntentSchema.parse({ type: 'none', reference: { source, productId, productIds, ordinal: null, category: null, minPrice: null, maxPrice: null, colors: [], materials: [], style: null, size: null }, confidence: 1, ambiguous: false, missingReference: false });
  if (ordinal !== null) {
    productId = context.productIds[ordinal - 1] || null;
    productIds = productId ? [productId] : [];
    source = productId ? 'ordinal_recommendation' : 'none';
    if (!productId) ambiguous = true;
  } else if (currentId && /mau nay|san pham nay/.test(text)) {
    source = 'current_product'; productId = currentId; productIds = [currentId];
  } else if (context.productIds.length) {
    source = 'last_recommendations'; productIds = context.productIds;
  }
  const requiresPrice = signal.type === 'cheaper' || signal.type === 'more_expensive';
  const requiresColors = signal.type === 'different_color';
  const requiresSize = signal.type === 'smaller' || signal.type === 'larger';
  const requiresMaterialOrStyle = signal.type === 'different_material' || signal.type === 'different_style';
  const requiresSingleProduct = signal.type === 'ordinal_product' || signal.type === 'stock_check';
  const requiresProductList = signal.type === 'different_product' || signal.type === 'similar_to_previous';
  const missingReference = source === 'none'
    || (requiresPrice && context.minPrice === null && context.maxPrice === null)
    || (requiresColors && !context.colors.length)
    || (requiresSize && context.size === null)
    || requiresMaterialOrStyle
    || (requiresSingleProduct && productId === null)
    || (requiresProductList && !productIds.length);
  return comparativeIntentSchema.parse({
    type: signal.type,
    reference: { source, productId, productIds, ordinal, category: context.category, minPrice: context.minPrice, maxPrice: context.maxPrice, colors: context.colors, materials: [], style: null, size: context.size },
    confidence: missingReference ? 0.5 : ambiguous ? 0.6 : 0.9,
    ambiguous,
    missingReference
  });
};
