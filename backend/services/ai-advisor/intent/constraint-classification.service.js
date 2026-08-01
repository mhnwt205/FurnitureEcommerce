import { AI_CATEGORIES, AI_COLORS, AI_MATERIALS, AI_ROOMS, AI_SIZES, AI_STYLES } from './intent.taxonomy.js';
import { constraintClassificationInputSchema, constraintClassificationSchema } from './constraint-classification.schema.js';

const canonical = (values, allowed) => [...new Set(Array.isArray(values) ? values : [])].filter((value) => allowed.includes(value)).slice(0, 5);
const scalar = (value, allowed) => allowed.includes(value) ? value : null;
const hasBudget = (budget) => budget?.min !== null || budget?.max !== null;

export const classifyAdvisorConstraints = (rawInput) => {
  const { intent, fieldMeta, operations, excluded } = constraintClassificationInputSchema.parse(rawInput);
  const strengths = operations.strengths || {};
  const strength = (field) => strengths[field] || fieldMeta[field]?.strength || 'unspecified';
  const required = (field) => strength(field) === 'required';
  const colors = canonical(intent.colors, AI_COLORS);
  const materials = canonical(intent.materials, AI_MATERIALS);
  const room = scalar(intent.room, AI_ROOMS);
  const style = scalar(intent.style, AI_STYLES);
  const size = scalar(intent.size, AI_SIZES);
  const exclusions = {
    categories: canonical(excluded.categories, AI_CATEGORIES),
    colors: canonical(excluded.colors, AI_COLORS),
    materials: canonical(excluded.materials, AI_MATERIALS),
    styles: canonical(excluded.styles, AI_STYLES)
  };
  const hard = {
    category: scalar(intent.category, AI_CATEGORIES),
    budget: hasBudget(intent.budget) ? { min: intent.budget.min, max: intent.budget.max, currency: 'VND' } : null,
    stockRequired: intent.stockRequired === true,
    colors: required('colors') ? colors : [],
    materials: required('materials') ? materials : [],
    room: required('room') ? room : null,
    style: required('style') ? style : null,
    size: required('size') ? size : null,
    exclusions
  };
  return constraintClassificationSchema.parse({
    hard,
    soft: {
      colors: hard.colors.length ? [] : colors,
      materials: hard.materials.length ? [] : materials,
      room: hard.room ? null : room,
      style: hard.style ? null : style,
      size: hard.size ? null : size,
      sortPreference: intent.sortPreference,
      pricePreference: 'unspecified',
      currentProductSimilarity: true
    },
    contextOnly: {
      intentType: intent.intentType,
      confidence: intent.confidence,
      missingImportantFields: intent.missingImportantFields,
      ambiguousFields: intent.ambiguousFields,
      constraints: intent.constraints
    }
  });
};
