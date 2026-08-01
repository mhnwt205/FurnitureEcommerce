const fallback = (reason, where) => ({ reason, where });
export const retrieveAdvisorCandidates = async ({ fetchProducts, primaryWhere, categorySlug, budget, hasAttributes }) => {
  const primaryCandidates = await fetchProducts(primaryWhere);
  let candidates = primaryCandidates;
  let fallbackUsed = false; let fallbackReason = 'none'; let fallbackWhere = null;
  if (candidates.length === 0 && categorySlug) {
    fallbackWhere = { isActive: true, category: { slug: categorySlug } }; fallbackReason = 'primary_empty_category_fallback'; fallbackUsed = true; candidates = await fetchProducts(fallbackWhere);
  }
  if (candidates.length === 0 && budget.intent && !categorySlug) {
    fallbackWhere = { isActive: true }; fallbackReason = 'primary_empty_all_active_fallback'; fallbackUsed = true; candidates = await fetchProducts(fallbackWhere);
  }
  if (candidates.length === 0 && hasAttributes) {
    fallbackWhere = { isActive: true, ...(categorySlug ? { category: { slug: categorySlug } } : {}) }; fallbackReason = categorySlug ? 'primary_empty_category_fallback' : 'primary_empty_all_active_fallback'; fallbackUsed = true; candidates = await fetchProducts(fallbackWhere);
  }
  return { candidates, metadata: { primaryCount: primaryCandidates.length, retrievedCount: candidates.length, fallbackUsed, fallbackReason, primaryWhere, fallbackWhere } };
};
