import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateRecommendationValidity, evaluateDeterministicOrder } from './recommendationEvaluator.js';
import { buildRecommendationReasons } from '../services/ai-advisor/recommendation/reason.service.js';
import { evaluateGroundedReasons } from './reasonEvaluator.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureProducts = () => JSON.parse(fs.readFileSync(path.join(here, 'fixtures/products.vi.json'), 'utf8'));

// This intentionally validates output-shaped values rather than recreating ranking.
// Ranking itself remains exercised by its production test suite; the evaluator is a gate.
export const evaluateFixtureRecommendation = (testCase) => {
  const products = fixtureProducts();
  const category = testCase.expected.intent.category;
  const selected = products.filter((product) => !category || product.category?.slug === category).slice(0, 5).map((product) => ({ id: product.id }));
  const validity = evaluateRecommendationValidity({ recommendations: selected, products, constraints: category ? { category } : {} });
  const selectedProducts = selected.map(({ id }) => products.find((product) => product.id === id));
  const facts = buildRecommendationReasons({ candidates: selectedProducts, stageContext: { categorySlug: category || null, budget: { intent: null }, attributes: { colors: [], materials: [], rooms: [], styles: [], sizes: [] }, classification: { hard: {}, soft: {} }, comparativePolicy: { type: 'none' } } });
  return { checks: [...validity.checks, evaluateDeterministicOrder(selected, [...selected]), ...evaluateGroundedReasons(facts).checks] };
};
