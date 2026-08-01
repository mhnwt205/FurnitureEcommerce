import { z } from 'zod';
import { AI_CATEGORIES, AI_COLORS, AI_INTENT_TYPES, AI_MATERIALS, AI_ROOMS, AI_SIZES, AI_SORT_PREFERENCES, AI_STYLES } from './intent.taxonomy.js';

const nullableInteger = z.number().int().nonnegative().nullable();

export const aiIntentBudgetSchema = z.object({
  min: nullableInteger,
  max: nullableInteger,
  currency: z.literal('VND')
}).strict().superRefine((budget, context) => {
  if (budget.min !== null && budget.max !== null && budget.min > budget.max) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['min'], message: 'budget.min must not exceed budget.max' });
  }
});

export const aiStructuredIntentSchema = z.object({
  intentType: z.enum(AI_INTENT_TYPES),
  category: z.enum(AI_CATEGORIES).nullable(),
  budget: aiIntentBudgetSchema,
  room: z.enum(AI_ROOMS).nullable(),
  style: z.enum(AI_STYLES).nullable(),
  colors: z.array(z.enum(AI_COLORS)).max(5),
  materials: z.array(z.enum(AI_MATERIALS)).max(5),
  size: z.enum(AI_SIZES).nullable(),
  stockRequired: z.boolean(),
  sortPreference: z.enum(AI_SORT_PREFERENCES).nullable(),
  constraints: z.array(z.string().trim().min(1).max(100)).max(10),
  confidence: z.number().min(0).max(1),
  missingImportantFields: z.array(z.string().trim().min(1).max(100)).max(10),
  ambiguousFields: z.array(z.string().trim().min(1).max(100)).max(10)
}).strict();

export const parseAiStructuredIntent = (value) => aiStructuredIntentSchema.parse(value);
