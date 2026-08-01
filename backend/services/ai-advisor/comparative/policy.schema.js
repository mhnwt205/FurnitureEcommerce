import { z } from 'zod';
import { AI_CATEGORIES, AI_COLORS, AI_MATERIALS, AI_SIZES, AI_STYLES } from '../intent/intent.taxonomy.js';
import { comparativeTypes } from './comparative.schema.js';

const ids = z.array(z.number().int().positive()).max(5);
const price = z.number().int().nonnegative().nullable();
const reference = z.object({ source: z.enum(['none', 'last_recommendations', 'current_product', 'ordinal_recommendation']), productId: z.number().int().positive().nullable(), effectivePrice: price }).strict();
export const comparativePolicySchema = z.object({
  action: z.enum(['none', 'apply', 'clarify_missing_reference', 'stock_check']),
  hardFilters: z.object({ maxPriceExclusive: price, minPriceExclusive: price, excludedProductIds: ids, sizeRelation: z.enum(['smaller', 'larger']).nullable(), referenceSize: z.enum(AI_SIZES).nullable(), targetProductId: z.number().int().positive().nullable() }).strict(),
  softPreferences: z.object({ preferDifferentColor: z.boolean(), referenceColors: z.array(z.enum(AI_COLORS)).max(5), preferDifferentMaterial: z.boolean(), referenceMaterials: z.array(z.enum(AI_MATERIALS)).max(5), preferDifferentStyle: z.boolean(), referenceStyles: z.array(z.enum(AI_STYLES)).max(5), preferSimilarCategory: z.enum(AI_CATEGORIES).nullable(), similarColors: z.array(z.enum(AI_COLORS)).max(5), similarMaterials: z.array(z.enum(AI_MATERIALS)).max(5), similarStyles: z.array(z.enum(AI_STYLES)).max(5), similarPriceMin: price, similarPriceMax: price, preferDifferentProduct: z.boolean() }).strict(),
  reference
}).strict();
export const comparativePolicyInputSchema = z.object({ comparativeState: z.object({ type: z.enum(comparativeTypes), reference: z.object({ source: z.enum(['none', 'last_recommendations', 'current_product', 'ordinal_recommendation']), productId: z.number().int().positive().nullable(), productIds: ids, ordinal: z.number().int().min(1).max(5).nullable(), category: z.enum(AI_CATEGORIES).nullable(), minPrice: price, maxPrice: price, colors: z.array(z.enum(AI_COLORS)).max(5), materials: z.array(z.enum(AI_MATERIALS)).max(5), style: z.enum(AI_STYLES).nullable(), size: z.enum(AI_SIZES).nullable() }).strict(), confidence: z.number().min(0).max(1), ambiguous: z.boolean(), missingReference: z.boolean(), updatedAtTurn: z.number().int().nonnegative().optional() }).strict(), productPrices: z.array(z.object({ productId: z.number().int().positive(), effectivePrice: z.number().int().nonnegative() }).strict()).max(5).default([]), currentProduct: z.object({ id: z.number().int().positive(), finalPrice: z.number().optional(), displayPrice: z.number().optional(), price: z.number().optional() }).passthrough().nullable().optional() }).strict();
