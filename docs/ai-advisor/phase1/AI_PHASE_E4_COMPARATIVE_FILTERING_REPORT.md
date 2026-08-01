# AI Phase E4 — Comparative Filtering and Scoring

## Scope

E4 consumes the bounded E3 comparative state without changing the public API, Prisma schema, frontend, base ranking weights or Gemini authority. Backend remains the source of candidate IDs, effective price, eligibility, score and DTO.

## Handler, rule and scorer registries

- `aiComparativePolicy.service.js` exposes an ordered type-handler registry. Each handler produces a strict policy instead of adding branches to conversation orchestration or `scoreProduct`.
- `aiComparativeEligibility.service.js` applies a separate Stage 1 hard rule after existing budget/required-attribute/exclusion/stock eligibility.
- `aiComparativeScoring.service.js` contains a bounded soft scorer registry; the E2 comparator remains unchanged and keeps product ID as the final tie-breaker.

## Reference price and context

Recommendation context now stores at most five `{ productId, effectivePrice }` pairs alongside existing bounded product IDs. Price comparisons use a resolved ordinal/current product price only; a range is never treated as the price of an ordinal product. Missing price/size/reference produces `clarify_missing_reference` rather than a guessed constraint.

## Hard filtering

- `cheaper`: final/effective price strictly less than the reference price.
- `more_expensive`: final/effective price strictly greater than the reference price.
- `different_product`: prior/reference IDs are excluded.
- `smaller`/`larger`: only apply when normalized reference size exists; relation is strict.

Existing hard constraints execute first and are never relaxed or bypassed. Comparative filters apply equally to fallback candidates and do not add a database query.

## Soft scoring

Different color/material/style and similarity category/color/material/style/price are preferences, not filters. Bonuses are bounded in `COMPARATIVE_SCORES` (maximum single comparative bonus 8) and leave non-matching candidates eligible. Existing E2 score constants are unchanged.

## Diagnostics and no-result handling

Stage 1 adds comparative before/after counts, applied/type metadata and Candidate Summary fields. Specific reasons include `no_cheaper_match`, `no_more_expensive_match`, `no_different_product`, `no_smaller_match`, `no_larger_match` and `missing_comparative_reference`; `unknown` is not appended to a specific reason. Question templates are a lookup table and preserve the clarification/terminal-cap pipeline.

## Session safety and compatibility

Comparative state and product price context remain on the working-session copy and commit only on a successful generation-current request. Recommendation context is updated atomically only for actual recommendations; no-result does not create a fake context. Duplicate, stale, reset, TTL and rotation behavior remains owned by the existing session store.

## Call-count and performance

Comparative eligibility is an O(n) in-memory pass over already eligible candidates. Stage 1/Stage 2 direct dependency-injection tests still prove one retrieval/enrichment/eligibility execution and no Stage 1 review/rank/writer. Clarification/no-result paths retain Stage 2 short-circuiting; no refetch or Gemini call is introduced.

## Remaining limitations / readiness E5

`stock_check` remains internal foundation-only and does not introduce a new product-info response. Size relations depend on normalized legacy size terms. E5 should add consent-based relaxation only; it must not weaken comparative hard constraints without explicit consent.
