import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEvaluationDataset } from '../evaluation/aiEvaluationCase.schema.js';
import { loadEvaluationDataset, filterEvaluationCases } from '../evaluation/datasetLoader.js';
import { evaluateRecommendationValidity, evaluateDeterministicOrder } from '../evaluation/recommendationEvaluator.js';
import { runAiEvaluation } from '../evaluation/runAiEvaluation.js';
import { buildEvaluationReport, evaluationReportMarkdown } from '../evaluation/reportGenerator.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const datasetPath = path.join(root, 'evaluation/datasets/vi-v1.json');

test('Phase G dataset is strict, versioned, unique, and has 100 Vietnamese cases', () => {
  const dataset = loadEvaluationDataset(datasetPath);
  assert.equal(dataset.version, 'vi-v1');
  assert.equal(dataset.cases.length, 100);
  assert.equal(new Set(dataset.cases.map((item) => item.id)).size, 100);
  assert.equal(dataset.cases.filter((item) => item.category === 'budget').length, 15);
  assert.throws(() => validateEvaluationDataset({ ...dataset, cases: [...dataset.cases, dataset.cases[0]] }), /Duplicate evaluation case id/);
});

test('Phase G evaluator detects hard product violations and nondeterministic order', () => {
  const products = [{ id: 1, isActive: true, stock: 0, finalPrice: 100, category: { slug: 'sofa' }, color: 'trang' }];
  const result = evaluateRecommendationValidity({ recommendations: [{ id: 1 }, { id: 1 }, { id: 99 }], products, constraints: { category: 'sofa', stockRequired: true, maxPrice: 90, excludedColors: ['trang'] } });
  assert.equal(result.checks.find((check) => check.metric === 'hard_constraint_validity').pass, false);
  assert.equal(result.checks.find((check) => check.metric === 'duplicate_recommendation_ids').pass, false);
  assert.equal(evaluateDeterministicOrder([{ id: 1 }], [{ id: 2 }]).pass, false);
});

test('Phase G report is deterministic, filterable, and fails a hard regression gate', () => {
  const dataset = loadEvaluationDataset(datasetPath);
  assert.equal(filterEvaluationCases(dataset, { tag: 'comparative' }).cases.length, 12);
  const report = buildEvaluationReport({ datasetVersion: 'vi-v1', cases: [{ id: 'bad', unsupported: false, checks: [{ metric: 'privacy_leakage', pass: false }] }] });
  assert.equal(report.pass, false);
  assert.match(evaluationReportMarkdown(report), /privacy_leakage/);
  const current = runAiEvaluation({ datasetPath });
  assert.equal(current.datasetVersion, 'vi-v1');
  assert.equal(current.totals.total, 100);
  assert.equal(current.pass, true);
});

test('Phase G comparison rejects a metric regression without changing its baseline', () => {
  const report = buildEvaluationReport({ datasetVersion: 'vi-v1', baseline: { metrics: { action_accuracy: { value: 1 } } }, cases: [{ id: 'regression', unsupported: false, checks: [{ metric: 'action_accuracy', pass: false }] }] });
  assert.equal(report.gates.regression_action_accuracy.pass, false);
  assert.equal(report.pass, false);
});
