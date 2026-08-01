import { z } from 'zod';
import { AI_CATEGORIES, AI_COLORS, AI_MATERIALS, AI_ROOMS, AI_SIZES, AI_SORT_PREFERENCES, AI_STYLES } from './intent.taxonomy.js';

const strengthSchema = z.enum(['required', 'preferred', 'unspecified']);
const canonicalExclusionsSchema = z.object({
  categories: z.array(z.enum(AI_CATEGORIES)).max(5),
  colors: z.array(z.enum(AI_COLORS)).max(5),
  materials: z.array(z.enum(AI_MATERIALS)).max(5),
  styles: z.array(z.enum(AI_STYLES)).max(5)
}).strict();

export const constraintClassificationInputSchema = z.object({
  intent: z.object({
    intentType: z.string().default('unknown'),
    category: z.string().nullable().default(null),
    budget: z.object({ min: z.number().int().nullable().default(null), max: z.number().int().nullable().default(null) }).passthrough().default({ min: null, max: null }),
    room: z.string().nullable().default(null), style: z.string().nullable().default(null), size: z.string().nullable().default(null),
    colors: z.array(z.string()).max(5).default([]), materials: z.array(z.string()).max(5).default([]), stockRequired: z.boolean().default(false),
    sortPreference: z.string().nullable().default(null), confidence: z.number().min(0).max(1).default(0),
    missingImportantFields: z.array(z.string()).max(10).default([]), ambiguousFields: z.array(z.string()).max(10).default([]), constraints: z.array(z.string()).max(10).default([])
  }).passthrough(),
  fieldMeta: z.record(z.string(), z.object({ strength: strengthSchema.optional() }).passthrough()).default({}),
  operations: z.object({ strengths: z.record(z.string(), strengthSchema).optional() }).passthrough().default({}),
  excluded: z.object({
    categories: z.array(z.string()).max(5).optional(), colors: z.array(z.string()).max(5).optional(),
    materials: z.array(z.string()).max(5).optional(), styles: z.array(z.string()).max(5).optional()
  }).strict().default({})
}).strict();

export const constraintClassificationSchema = z.object({
  hard: z.object({ category: z.enum(AI_CATEGORIES).nullable(), budget: z.object({ min: z.number().int().nullable(), max: z.number().int().nullable(), currency: z.literal('VND') }).nullable(), stockRequired: z.boolean(), colors: z.array(z.enum(AI_COLORS)).max(5), materials: z.array(z.enum(AI_MATERIALS)).max(5), room: z.enum(AI_ROOMS).nullable(), style: z.enum(AI_STYLES).nullable(), size: z.enum(AI_SIZES).nullable(), exclusions: canonicalExclusionsSchema }).strict(),
  soft: z.object({ colors: z.array(z.enum(AI_COLORS)).max(5), materials: z.array(z.enum(AI_MATERIALS)).max(5), room: z.enum(AI_ROOMS).nullable(), style: z.enum(AI_STYLES).nullable(), size: z.enum(AI_SIZES).nullable(), sortPreference: z.enum(AI_SORT_PREFERENCES).nullable(), pricePreference: z.enum(['unspecified']).nullable(), currentProductSimilarity: z.boolean() }).strict(),
  contextOnly: z.object({ intentType: z.string(), confidence: z.number().min(0).max(1), missingImportantFields: z.array(z.string()).max(10), ambiguousFields: z.array(z.string()).max(10), constraints: z.array(z.string()).max(10) }).strict()
}).strict();
