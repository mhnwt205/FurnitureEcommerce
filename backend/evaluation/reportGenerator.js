const pct = (value) => `${(value * 100).toFixed(1)}%`;

export const buildEvaluationReport = ({ datasetVersion, cases, baseline = null, branch = 'unknown' }) => {
  const metricBuckets = new Map();
  for (const item of cases) for (const check of item.checks) {
    const bucket = metricBuckets.get(check.metric) || { passed: 0, total: 0 };
    bucket.total += 1; if (check.pass) bucket.passed += 1; metricBuckets.set(check.metric, bucket);
  }
  const metrics = Object.fromEntries([...metricBuckets].map(([name, bucket]) => [name, { ...bucket, value: bucket.total ? bucket.passed / bucket.total : null }]));
  const hard = {
    hard_constraint_validity: 1,
    invalid_product_rate: 1,
    duplicate_recommendation_ids: 1,
    deterministic_replay: 1,
    privacy_leakage: 1
  };
  const gates = Object.fromEntries(Object.entries(hard).map(([metric, minimum]) => {
    const value = metrics[metric]?.value ?? 1;
    return [metric, { type: 'hard', minimum, actual: value, pass: value >= minimum }];
  }));
  const failures = cases.filter((item) => item.checks.some((check) => !check.pass)).map((item) => item.id);
  const baselineMetrics = baseline?.metrics || {};
  const deltas = Object.fromEntries(Object.entries(metrics).map(([name, value]) => [name, baselineMetrics[name]?.value === undefined || value.value === null ? null : value.value - baselineMetrics[name].value]));
  for (const [name, delta] of Object.entries(deltas)) {
    if (delta !== null && delta < -0.02) gates[`regression_${name}`] = { type: 'regression', minimum: -0.02, actual: delta, pass: false };
  }
  return { datasetVersion, timestamp: new Date().toISOString(), branch, totals: { total: cases.length, passed: cases.filter((item) => item.checks.every((check) => check.pass)).length, failed: failures.length, unsupported: cases.filter((item) => item.unsupported).length }, metrics, gates, deltas, failedCaseIds: failures, pass: Object.values(gates).every((gate) => gate.pass) };
};

export const evaluationReportMarkdown = (report) => `# AI evaluation ${report.datasetVersion}\n\n- Cases: ${report.totals.total}; passed: ${report.totals.passed}; failed: ${report.totals.failed}; unsupported: ${report.totals.unsupported}\n- Hard quality gates: ${report.pass ? 'PASS' : 'FAIL'}\n\n## Metrics\n\n| Metric | Result | Passed / total |\n|---|---:|---:|\n${Object.entries(report.metrics).map(([name, value]) => `| ${name} | ${value.value === null ? 'n/a' : pct(value.value)} | ${value.passed}/${value.total} |`).join('\n')}\n\n## Gates\n\n${Object.entries(report.gates).map(([name, gate]) => `- ${gate.pass ? 'PASS' : 'FAIL'} ${name}: ${pct(gate.actual)} (minimum ${pct(gate.minimum)})`).join('\n')}\n\n## Failed case IDs\n\n${report.failedCaseIds.length ? report.failedCaseIds.map((id) => `- ${id}`).join('\n') : '- None'}\n`;
