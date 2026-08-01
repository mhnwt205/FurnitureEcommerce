import { groundedWriterOutputSchema, recommendationReasonFactSchema } from './reason.schema.js';
import { presentGroundedReason } from './reason-presentation.js';

const effectivePrice = (product) => { const value = Number(product.finalPrice ?? product.effectivePrice ?? product.price); return Number.isFinite(value) && value >= 0 ? Math.round(value) : null; };
const matches = (value, requested = []) => typeof value === 'string' && requested.some((item) => value.toLowerCase().includes(String(item).toLowerCase()));
const budgetMatch = (price, budget) => { const min = budget?.minPrice ?? budget?.min ?? null; const max = budget?.maxPrice ?? budget?.max ?? null; return !budget?.intent || (price !== null && (min === null || price >= min) && (max === null || price <= max)); };
const comparativeCode = (policy, product, price) => {
  if (policy?.action !== 'apply') return null;
  if (policy.hardFilters?.maxPriceExclusive !== null && price !== null && price < policy.hardFilters.maxPriceExclusive) return 'cheaper_than_reference';
  if (policy.hardFilters?.minPriceExclusive !== null && price !== null && price > policy.hardFilters.minPriceExclusive) return 'more_expensive_than_reference';
  if (policy.softPreferences?.preferDifferentColor && !(policy.softPreferences.referenceColors || []).some((color) => String(product.color || '').toLowerCase().includes(color))) return 'different_color';
  if (policy.softPreferences?.preferSimilarCategory && product.category?.slug === policy.softPreferences.preferSimilarCategory) return 'similar_to_previous';
  return null;
};

export const buildRecommendationReasons = ({ candidates, stageContext }) => {
  const facts = new Map();
  for (const product of candidates) {
    const price = effectivePrice(product); const attributes = stageContext.attributes || {}; const codes = [];
    const comparative = comparativeCode(stageContext.comparativePolicy, product, price);
    if (comparative) codes.push(comparative);
    if (stageContext.categorySlug && product.category?.slug === stageContext.categorySlug) codes.push('category_match');
    if (stageContext.budget?.intent && budgetMatch(price, stageContext.budget)) codes.push('budget_match');
    if (Number(product.stock) > 0) codes.push('in_stock');
    if (product.hasPromotion === true) codes.push('promotion_active');
    if (matches(product.color, attributes.colors)) codes.push('color_match');
    if (matches(product.material, attributes.materials)) codes.push('material_match');
    if (matches(product.style, attributes.styles)) codes.push('style_match');
    if (matches(product.roomType, attributes.rooms)) codes.push('room_match');
    if (Number(product.averageRating) >= 4.5 && Number(product.reviewCount) >= 5) codes.push('high_review');
    const selectedCodes = [...new Set(codes)].slice(0, 3);
    facts.set(product.id, recommendationReasonFactSchema.parse({ productId: product.id, reasonCodes: selectedCodes, facts: { effectivePrice: price, withinBudget: budgetMatch(price, stageContext.budget), inStock: Number(product.stock) > 0, matchedColors: matches(product.color, attributes.colors) ? [product.color] : [], matchedMaterials: matches(product.material, attributes.materials) ? [product.material] : [], matchedStyles: matches(product.style, attributes.styles) ? [product.style] : [], matchedRooms: matches(product.roomType, attributes.rooms) ? [product.roomType] : [], matchedSize: false, promotionLabel: product.hasPromotion === true ? String(product.promotion?.name || 'Khuyến mãi').slice(0, 100) : null, reviewRating: Number.isFinite(Number(product.averageRating)) ? Number(product.averageRating) : null, reviewCount: Number.isFinite(Number(product.reviewCount)) ? Math.max(0, Math.trunc(Number(product.reviewCount))) : 0, comparativeDelta: comparative && price !== null && Number.isInteger(stageContext.comparativePolicy?.reference?.effectivePrice) ? price - stageContext.comparativePolicy.reference.effectivePrice : null } }));
  }
  return facts;
};

const safeWriterText = (text) => typeof text === 'string' && text.length <= 240 && !/[<>]/.test(text) && !/\d/.test(text);
export const validateGroundedWriterOutput = (output, { orderedIds, allowedFacts }) => {
  let parsed; try { parsed = groundedWriterOutputSchema.parse(output); } catch { return null; }
  const seen = new Set(); const source = new Map();
  for (const reason of parsed.reasons) {
    const allowed = allowedFacts.get(reason.productId);
    if (!allowed || seen.has(reason.productId) || !safeWriterText(reason.text) || reason.usedReasonCodes.some((code) => !allowed.reasonCodes.includes(code))) continue;
    seen.add(reason.productId); source.set(reason.productId, reason.text);
  }
  return { answer: parsed.answer, reasonMap: new Map(orderedIds.filter((id) => source.has(id)).map((id) => [id, source.get(id)])) };
};
export const deterministicReasonMap = (facts) => new Map([...facts.entries()].map(([id, value]) => [id, presentGroundedReason(value.reasonCodes)]));
