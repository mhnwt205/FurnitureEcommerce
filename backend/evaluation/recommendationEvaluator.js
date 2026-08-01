const effectivePrice = (product) => Number(product.finalPrice ?? product.price ?? 0);
const canonical = (value = '') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const evaluateRecommendationValidity = ({ recommendations = [], products = [], constraints = {} }) => {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const ids = recommendations.map((item) => item.id);
  const violations = [];
  for (const id of ids) {
    const product = productsById.get(id);
    if (!product) { violations.push('invalid_product'); continue; }
    if (product.isActive === false) violations.push('inactive');
    if (constraints.category && product.category?.slug !== constraints.category) violations.push('category');
    if (constraints.maxPrice !== undefined && effectivePrice(product) > constraints.maxPrice) violations.push('budget');
    if (constraints.stockRequired && !(Number(product.stock) > 0)) violations.push('stock');
    for (const color of constraints.excludedColors || []) if (canonical(product.color) === canonical(color)) violations.push('exclusion');
  }
  return {
    checks: [
      { metric: 'hard_constraint_validity', pass: violations.length === 0 },
      { metric: 'invalid_product_rate', pass: !violations.includes('invalid_product') },
      { metric: 'duplicate_recommendation_ids', pass: ids.length === new Set(ids).size },
      { metric: 'top_n_bound', pass: ids.length <= 5 }
    ],
    violations
  };
};

export const evaluateDeterministicOrder = (first = [], second = []) => ({ metric: 'deterministic_replay', pass: JSON.stringify(first.map((item) => item.id)) === JSON.stringify(second.map((item) => item.id)) });
