import { AI_SIZES } from '../intent/intent.taxonomy.js';
const price = (p) => Number(p.finalPrice ?? p.displayPrice ?? p.price ?? 0);
const sizeRank = Object.freeze({ mini: 0, small: 1, low: 1, wide: 2, tall: 2, large: 3 });
const productSize = (product) => AI_SIZES.includes(product?.size) ? product.size : null;
export const applyComparativeEligibility = ({ candidates = [], policy }) => {
  const beforeComparativeCount = candidates.length;
  if (policy.action !== 'apply') return { candidates, diagnostics: { beforeComparativeCount, afterComparativeCount: beforeComparativeCount, comparativeApplied: false, comparativeType: null } };
  const h = policy.hardFilters;
  const filtered = candidates.filter((p) => {
    if (h.maxPriceExclusive !== null && !(price(p) < h.maxPriceExclusive)) return false;
    if (h.minPriceExclusive !== null && !(price(p) > h.minPriceExclusive)) return false;
    if (h.excludedProductIds.includes(p.id)) return false;
    if (h.sizeRelation) { const value = productSize(p); if (!value || sizeRank[value] === undefined || sizeRank[h.referenceSize] === undefined) return false; if (h.sizeRelation === 'smaller' && !(sizeRank[value] < sizeRank[h.referenceSize])) return false; if (h.sizeRelation === 'larger' && !(sizeRank[value] > sizeRank[h.referenceSize])) return false; }
    return true;
  });
  return { candidates: filtered, diagnostics: { beforeComparativeCount, afterComparativeCount: filtered.length, comparativeApplied: Boolean(h.maxPriceExclusive !== null || h.minPriceExclusive !== null || h.excludedProductIds.length || h.sizeRelation), comparativeType: policy.hardFilters.maxPriceExclusive !== null ? 'cheaper' : policy.hardFilters.minPriceExclusive !== null ? 'more_expensive' : h.sizeRelation || (h.excludedProductIds.length ? 'different_product' : null) } };
};
