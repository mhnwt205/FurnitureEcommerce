import { z } from 'zod';
import { AI_CATEGORIES, AI_COLORS, AI_MATERIALS, AI_SIZES, AI_STYLES } from '../intent/intent.taxonomy.js';

export const comparativeTypes = ['none', 'cheaper', 'more_expensive', 'different_color', 'different_material', 'different_style', 'smaller', 'larger', 'different_product', 'ordinal_product', 'similar_to_previous', 'stock_check'];
const referenceSource = z.enum(['none', 'last_recommendations', 'current_product', 'ordinal_recommendation']);
export const comparativeReferenceSchema = z.object({
  source: referenceSource,
  productId: z.number().int().positive().nullable(),
  productIds: z.array(z.number().int().positive()).max(5),
  ordinal: z.number().int().min(1).max(5).nullable(),
  category: z.enum(AI_CATEGORIES).nullable(),
  minPrice: z.number().int().nonnegative().nullable(),
  maxPrice: z.number().int().nonnegative().nullable(),
  colors: z.array(z.enum(AI_COLORS)).max(5),
  materials: z.array(z.enum(AI_MATERIALS)).max(5),
  style: z.enum(AI_STYLES).nullable(),
  size: z.enum(AI_SIZES).nullable()
}).strict().superRefine((value, ctx) => { if (value.minPrice !== null && value.maxPrice !== null && value.minPrice > value.maxPrice) ctx.addIssue({ code: 'custom', message: 'minPrice must not exceed maxPrice' }); });

export const comparativeIntentSchema = z.object({
  type: z.enum(comparativeTypes),
  reference: comparativeReferenceSchema,
  confidence: z.number().min(0).max(1),
  ambiguous: z.boolean(),
  missingReference: z.boolean()
}).strict();

export const comparativeStateSchema = comparativeIntentSchema.extend({ updatedAtTurn: z.number().int().nonnegative() }).strict();
