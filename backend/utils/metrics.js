const requests = new Map();

export const recordHttpMetric = ({ method, path, statusCode, durationMs }) => {
  const key = `${method}:${path}:${Math.floor(statusCode / 100)}xx`;
  const current = requests.get(key) || { count: 0, errors: 0, durationMs: 0 };
  current.count += 1;
  current.errors += statusCode >= 500 ? 1 : 0;
  current.durationMs += durationMs;
  requests.set(key, current);
};

export const snapshotMetrics = () => ({
  process: { uptimeSeconds: Number(process.uptime().toFixed(2)), pid: process.pid },
  http: [...requests.entries()].map(([key, value]) => ({ key, ...value, averageDurationMs: Number((value.durationMs / value.count).toFixed(2)) }))
});
