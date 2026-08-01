import { AI_CATEGORIES, AI_COLORS, AI_MATERIALS, AI_STYLES, legacyToIntent } from '../intent/intent.taxonomy.js';

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .toLowerCase()
  .trim();

const canonicalSet = (values, allowed) => new Set(
  [...new Set(Array.isArray(values) ? values : [])]
    .filter((value) => allowed.includes(value))
    .slice(0, 5)
);

const canonicalValues = (rawValue, mapping, allowed) => {
  const rawParts = String(rawValue ?? '').split(/[,/|;]/).map(normalize).filter(Boolean);
  const values = [];
  for (const raw of rawParts) {
    for (const [legacy, canonical] of mapping) {
      if (raw === normalize(legacy) && allowed.includes(canonical)) values.push(canonical);
    }
  }
  return [...new Set(values)];
};

const canonicalCategory = (product) => {
  const category = product?.category?.slug;
  return AI_CATEGORIES.includes(category) ? category : null;
};

const matchesAnyExcluded = (values, excluded) => values.some((value) => excluded.has(value));

const defaultBudgetMatches = (product, budget) => {
  const price = Number(product?.finalPrice ?? product?.displayPrice ?? product?.price ?? 0);
  if (budget?.minPrice !== null && budget?.minPrice !== undefined && price < budget.minPrice) return false;
  if (budget?.maxPrice !== null && budget?.maxPrice !== undefined && price > budget.maxPrice) return false;
  return true;
};

const defaultAttributeMatch = () => ({ exact: true });

export const applyCandidateEligibility = ({
  candidates = [],
  budget = {},
  attributes = {},
  hasAttributes = false,
  excluded = {},
  stockRequired = false,
  budgetMatches = defaultBudgetMatches,
  getAttributeMatch = defaultAttributeMatch
}) => {
  const source = Array.isArray(candidates) ? candidates : [];
  const budgetCandidates = source.filter((product) => budgetMatches(product, budget));
  let attributeCandidates = budget?.intent ? budgetCandidates : source;
  let noExactAttributeMatch = false;

  if (hasAttributes) {
    const exact = attributeCandidates.filter((product) => getAttributeMatch(product, attributes).exact);
    const requiresExactMatch = Boolean(
      attributes?.colors?.length || attributes?.materials?.length || attributes?.rooms?.length ||
      attributes?.styles?.length || attributes?.dimensions?.widthCm ||
      attributes?.dimensions?.heightCm || attributes?.dimensions?.depthCm
    );
    if (exact.length) attributeCandidates = exact;
    else if (requiresExactMatch) {
      attributeCandidates = [];
      noExactAttributeMatch = true;
    }
  }

  const excludedCategories = canonicalSet(excluded?.categories, AI_CATEGORIES);
  const excludedColors = canonicalSet(excluded?.colors, AI_COLORS);
  const excludedMaterials = canonicalSet(excluded?.materials, AI_MATERIALS);
  const excludedStyles = canonicalSet(excluded?.styles, AI_STYLES);
  const hasExclusions = excludedCategories.size || excludedColors.size || excludedMaterials.size || excludedStyles.size;
  const exclusionCandidates = attributeCandidates.filter((product) => {
    if (excludedCategories.has(canonicalCategory(product))) return false;
    if (matchesAnyExcluded(canonicalValues(product?.color, legacyToIntent.color, AI_COLORS), excludedColors)) return false;
    if (matchesAnyExcluded(canonicalValues(product?.material, legacyToIntent.material, AI_MATERIALS), excludedMaterials)) return false;
    if (matchesAnyExcluded(canonicalValues(product?.style, legacyToIntent.style, AI_STYLES), excludedStyles)) return false;
    return true;
  });

  const stockCandidates = stockRequired === true
    ? exclusionCandidates.filter((product) => Number(product?.stock) > 0)
    : exclusionCandidates;

  return {
    candidates: stockCandidates,
    diagnostics: {
      beforeBudgetCount: source.length,
      afterBudgetCount: budgetCandidates.length,
      beforeAttributeCount: budget?.intent ? budgetCandidates.length : source.length,
      afterAttributeCount: attributeCandidates.length,
      beforeExclusionCount: attributeCandidates.length,
      afterExclusionCount: exclusionCandidates.length,
      beforeStockCount: exclusionCandidates.length,
      afterStockCount: stockCandidates.length,
      exclusionApplied: Boolean(hasExclusions),
      stockRequired: stockRequired === true
    },
    noExactAttributeMatch,
    exclusionApplied: Boolean(hasExclusions),
    stockRequired: stockRequired === true
  };
};
