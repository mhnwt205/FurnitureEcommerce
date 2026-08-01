import { recommendationDiversificationInputSchema, recommendationDiversificationOutputSchema } from './diversification.schema.js';

export const MAX_DIVERSITY_SCORE_GAP = 10;
const price = (product) => { const value = Number(product.finalPrice ?? product.effectivePrice ?? product.price); return Number.isFinite(value) && value >= 0 ? Math.round(value) : null; };
const band = (product) => { const value = price(product); return value === null ? null : Math.floor(value / 5_000_000); };
const text = (value) => typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
const dimensions = (product) => ({ price_band: band(product), color: text(product.color), material: text(product.material), style: text(product.style) });
const utility = (candidate, selected, bestScore) => {
  if (bestScore - candidate.score > MAX_DIVERSITY_SCORE_GAP) return candidate.score;
  const candidateDimensions = dimensions(candidate.product);
  const seen = new Set(selected.flatMap((item) => Object.entries(dimensions(item.product)).map(([key, value]) => `${key}:${value}`)));
  const bonus = Object.entries(candidateDimensions).reduce((total, [key, value]) => total + (value !== null && !seen.has(`${key}:${value}`) ? 2 : 0), 0);
  return candidate.score + Math.min(bonus, 6);
};

export const diversifyRecommendations = (input) => {
  const { rankedCandidates, limit, context } = recommendationDiversificationInputSchema.parse(input);
  const unique = []; const ids = new Set(); let skippedDuplicateLikeCount = 0;
  for (const item of rankedCandidates) { if (ids.has(item.product.id)) { skippedDuplicateLikeCount += 1; continue; } ids.add(item.product.id); unique.push(item); }
  const explicitSort = ['price_asc', 'price_desc', 'rating_desc', 'newest'].includes(context.sortPreference);
  const selected = explicitSort ? unique.slice(0, limit) : [];
  const bestScore = unique[0]?.score ?? 0;
  while (!explicitSort && selected.length < limit && unique.length) {
    const next = selected.length === 0 ? unique[0] : unique.reduce((best, candidate) => utility(candidate, selected, bestScore) > utility(best, selected, bestScore) ? candidate : best, unique[0]);
    selected.push(next); unique.splice(unique.indexOf(next), 1);
  }
  const diversityDimensions = explicitSort ? [] : ['price_band', 'color', 'material', 'style'].filter((key) => new Set(selected.map((item) => dimensions(item.product)[key]).filter(Boolean)).size > 1);
  const diversityApplied = !explicitSort && diversityDimensions.length > 0;
  const diversitySkippedReason = explicitSort ? 'explicit_sort_preserved' : unique.length + selected.length < 2 ? 'insufficient_candidates' : diversityApplied ? null : 'no_diverse_alternative';
  return recommendationDiversificationOutputSchema.parse({ selectedCandidates: selected.map((item) => item.product), diagnostics: { inputCount: rankedCandidates.length, selectedCount: selected.length, skippedDuplicateLikeCount, diversityApplied, diversityDimensions, diversitySkippedReason } });
};
