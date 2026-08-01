import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEvaluationDataset, filterEvaluationCases, defaultDatasetPath } from './datasetLoader.js';
import { evaluateIntentCase } from './intentEvaluator.js';
import { evaluatePolicyCase } from './policyEvaluator.js';
import { evaluatePrivacy } from './privacyEvaluator.js';
import { evaluateFixtureRecommendation } from './fixtureEvaluator.js';
import { buildEvaluationReport, evaluationReportMarkdown } from './reportGenerator.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : null; };
const has = (name) => process.argv.includes(name);
const readJson = (file) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;

export const runAiEvaluation = ({ datasetPath = defaultDatasetPath(), caseId = null, tag = null, baselinePath = path.join(here, 'baselines/vi-v1.json') } = {}) => {
  const dataset = filterEvaluationCases(loadEvaluationDataset(datasetPath), { caseId, tag });
  const cases = dataset.cases.map((testCase) => {
    const intent = evaluateIntentCase(testCase);
    const policy = evaluatePolicyCase(testCase, intent);
    const privacy = evaluatePrivacy(testCase);
    const fixture = evaluateFixtureRecommendation(testCase);
    return { id: testCase.id, unsupported: intent.unsupported || policy.unsupported, checks: [...intent.checks, ...policy.checks, ...privacy.checks, ...fixture.checks] };
  });
  return buildEvaluationReport({ datasetVersion: dataset.version, cases, baseline: readJson(baselinePath), branch: process.env.GIT_BRANCH || 'codex/ai-phase-a-characterization' });
};

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const report = runAiEvaluation({ datasetPath: arg('--dataset') || defaultDatasetPath(), caseId: arg('--case'), tag: arg('--tag'), baselinePath: arg('--baseline') || path.join(here, 'baselines/vi-v1.json') });
  const jsonFile = arg('--json') || path.join(here, 'reports/vi-v1.latest.json');
  const markdownFile = arg('--markdown') || path.join(here, 'reports/vi-v1.latest.md');
  fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
  fs.writeFileSync(jsonFile, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownFile, evaluationReportMarkdown(report));
  if (has('--update-baseline')) fs.writeFileSync(path.join(here, 'baselines/vi-v1.json'), `${JSON.stringify({ datasetVersion: report.datasetVersion, metrics: report.metrics, updatedBy: 'explicit-cli' }, null, 2)}\n`);
  process.stdout.write(`${report.pass ? 'PASS' : 'FAIL'} ${report.datasetVersion}: ${report.totals.passed}/${report.totals.total} cases\n`);
  process.exitCode = report.pass ? 0 : 1;
}
