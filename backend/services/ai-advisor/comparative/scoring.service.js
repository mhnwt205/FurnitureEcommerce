import { legacyToIntent } from '../intent/intent.taxonomy.js';
export const COMPARATIVE_SCORES = Object.freeze({ differentColor: 8, differentMaterial: 6, differentStyle: 6, similarCategory: 8, similarColor: 5, similarMaterial: 4, similarStyle: 4, similarPrice: 6 });
const values = (value, mapping) => [...mapping].filter(([legacy]) => String(value || '').toLowerCase().includes(legacy)).map(([, canonical]) => canonical);
const price = (p) => Number(p.finalPrice ?? p.displayPrice ?? p.price ?? 0);
const includesNone = (actual, ref) => !actual.some(x => ref.includes(x));
const registry = [
  (p, s) => s.preferDifferentColor && includesNone(values(p.color, legacyToIntent.color), s.referenceColors) ? COMPARATIVE_SCORES.differentColor : 0,
  (p, s) => s.preferDifferentMaterial && includesNone(values(p.material, legacyToIntent.material), s.referenceMaterials) ? COMPARATIVE_SCORES.differentMaterial : 0,
  (p, s) => s.preferDifferentStyle && includesNone(values(p.style, legacyToIntent.style), s.referenceStyles) ? COMPARATIVE_SCORES.differentStyle : 0,
  (p, s) => s.preferSimilarCategory && p.category?.slug === s.preferSimilarCategory ? COMPARATIVE_SCORES.similarCategory : 0,
  (p, s) => s.similarColors.some(x => values(p.color, legacyToIntent.color).includes(x)) ? COMPARATIVE_SCORES.similarColor : 0,
  (p, s) => s.similarMaterials.some(x => values(p.material, legacyToIntent.material).includes(x)) ? COMPARATIVE_SCORES.similarMaterial : 0,
  (p, s) => s.similarStyles.some(x => values(p.style, legacyToIntent.style).includes(x)) ? COMPARATIVE_SCORES.similarStyle : 0,
  (p, s) => s.similarPriceMin !== null && s.similarPriceMax !== null && price(p) >= s.similarPriceMin && price(p) <= s.similarPriceMax ? COMPARATIVE_SCORES.similarPrice : 0
];
export const scoreComparativePreferences = (product, policy) => policy?.action === 'apply' ? registry.reduce((sum, scorer) => sum + scorer(product, policy.softPreferences), 0) : 0;
export const comparativeScorerRegistry = Object.freeze(registry);
