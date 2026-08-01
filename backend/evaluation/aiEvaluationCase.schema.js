import { z } from 'zod';

const boundedText = z.string().trim().min(1).max(500);
const nullableId = z.number().int().positive().nullable();
const action = z.enum(['recommendation', 'clarification', 'relaxation_proposal', 'no_result', 'unsupported']);

export const aiEvaluationCaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{3,80}$/),
  category: z.string().regex(/^[a-z0-9_-]{2,40}$/),
  input: z.object({
    message: boundedText,
    context: z.object({
      currentProductId: nullableId.optional().default(null),
      priorTurns: z.array(z.object({ role: z.enum(['user', 'assistant']), kind: z.string().max(40) })).max(8).default([]),
      lastRecommendationContext: z.object({ productIds: z.array(z.number().int().positive()).max(5) }).passthrough().nullable().optional().default(null)
    }).strict().default({})
  }).strict(),
  expected: z.object({
    intent: z.record(z.string(), z.unknown()).default({}),
    action,
    clarificationField: z.string().max(30).nullable().default(null),
    noResultReason: z.string().max(50).nullable().default(null),
    hardConstraints: z.record(z.string(), z.unknown()).default({}),
    softPreferences: z.record(z.string(), z.unknown()).default({}),
    comparativeType: z.string().max(40).nullable().default(null),
    recommendationRules: z.record(z.string(), z.unknown()).default({}),
    privacyExpectations: z.record(z.string(), z.unknown()).default({})
  }).strict(),
  tags: z.array(z.string().regex(/^[a-z0-9_-]{2,30}$/)).min(1).max(8)
}).strict();

export const aiEvaluationDatasetSchema = z.object({
  version: z.literal('vi-v1'),
  cases: z.array(aiEvaluationCaseSchema).min(100).max(250)
}).strict();

export const validateEvaluationDataset = (value) => {
  const dataset = aiEvaluationDatasetSchema.parse(value);
  const ids = new Set();
  for (const item of dataset.cases) {
    if (ids.has(item.id)) throw new Error(`Duplicate evaluation case id: ${item.id}`);
    ids.add(item.id);
  }
  return dataset;
};
