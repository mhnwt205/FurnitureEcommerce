import { z } from 'zod';

export const recommendationDiversificationInputSchema = z.object({
  rankedCandidates: z.array(z.object({ product: z.object({ id: z.number().int().positive() }).passthrough(), score: z.number() }).strict()).max(50),
  limit: z.number().int().min(1).max(5),
  context: z.object({ category: z.string().nullable().optional(), comparativeType: z.string().nullable().optional(), sortPreference: z.string().nullable().optional(), softPreferences: z.object({}).passthrough().optional() }).strict()
}).strict();

export const recommendationDiversificationOutputSchema = z.object({
  selectedCandidates: z.array(z.object({ id: z.number().int().positive() }).passthrough()).max(5),
  diagnostics: z.object({ inputCount: z.number().int().nonnegative(), selectedCount: z.number().int().nonnegative(), skippedDuplicateLikeCount: z.number().int().nonnegative(), diversityApplied: z.boolean(), diversityDimensions: z.array(z.enum(['price_band', 'color', 'material', 'style'])).max(4), diversitySkippedReason: z.enum(['explicit_sort_preserved', 'insufficient_candidates', 'no_diverse_alternative']).nullable() }).strict()
}).strict();
