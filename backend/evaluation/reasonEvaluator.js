export const evaluateGroundedReasons = (facts = new Map()) => {
  const checks = [];
  for (const value of facts.values()) {
    checks.push({ metric: 'reason_grounding_validity', pass: Array.isArray(value.reasonCodes) && value.reasonCodes.length <= 3 });
    checks.push({ metric: 'reason_grounding_validity', pass: !(value.reasonCodes || []).includes('in_stock') || value.facts?.inStock === true });
    checks.push({ metric: 'reason_grounding_validity', pass: !(value.reasonCodes || []).includes('promotion_active') || value.facts?.promotionLabel });
  }
  return { checks };
};
