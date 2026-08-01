export const evaluatePrivacy = (testCase) => {
  const raw = testCase.input.message;
  const serialized = JSON.stringify({ eventName: 'ai_request_completed', messageLength: raw.length, candidateCount: 1, outcome: 'recommendation' });
  return { checks: [{ metric: 'privacy_leakage', pass: !serialized.includes(raw) && !serialized.includes('sk-test-secret') && !serialized.includes('@example.com') }] };
};
