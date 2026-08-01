import fs from 'node:fs';
import path from 'node:path';
import { validateEvaluationDataset } from './aiEvaluationCase.schema.js';

export const loadEvaluationDataset = (filePath) => validateEvaluationDataset(JSON.parse(fs.readFileSync(filePath, 'utf8')));

export const filterEvaluationCases = (dataset, { caseId = null, tag = null } = {}) => ({
  ...dataset,
  cases: dataset.cases.filter((item) => (!caseId || item.id === caseId) && (!tag || item.tags.includes(tag)))
});

export const defaultDatasetPath = () => path.resolve(process.cwd(), 'evaluation/datasets/vi-v1.json');
