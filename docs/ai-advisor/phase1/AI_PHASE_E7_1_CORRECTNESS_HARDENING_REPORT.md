# Phase E7.1 — Recommendation Correctness Hardening

## Scope

This patch resolves the two correctness blockers found by the E7 audit without changing the public API, Prisma schema, frontend, retrieval, eligibility order, ranking weights, or session contracts.

## Diversification sort fix

`diversifyRecommendations` now treats `rankedCandidates` as the authoritative E2 ranking order. It does not call `sort()` and does not recreate a partial comparator.

- `relevance`: greedy diversity selection remains available inside the existing score-gap policy. Equal utility keeps the earlier authority-ranked candidate.
- `price_asc`, `price_desc`, `rating_desc`, `newest`: diversification is deliberately disabled. The result is the first unique product IDs in the authority-ranked order.
- Duplicate product IDs are removed by retaining the first authority-ranked occurrence.
- Diagnostics now expose an internal `diversitySkippedReason`, including `explicit_sort_preserved`.

This protects the E2 comparator's score, stock, effective-price, rating, review-count, created-at, and final product-ID semantics.

## Normalized size authority

Comparative smaller/larger filtering accepts only `product.size` when it is an exact member of `AI_SIZES`.

It no longer reads `dimensions`, `name`, or `description`. A candidate without canonical size cannot prove a smaller/larger relation and is not treated as a match. A reference without canonical `lastRecommendationContext.dominantSize` remains `clarify_missing_reference`; no hard size filter is constructed.

The existing taxonomy order remains unchanged: `mini`, `small`/`low`, `wide`/`tall`, `large`. No new enum values were introduced.

## Regression evidence

Direct tests cover:

- preservation of price ascending/descending, rating, and newest Stage 2 ranked order;
- E2 ranking equivalence when raw input is reversed before ranking;
- relevance diversification within the score gap and original-ranked-index tie behavior;
- duplicate-ID retention and input immutability;
- canonical smaller/larger relations;
- rejection of size inference from name, description, and dimensions;
- missing canonical reference size producing `clarify_missing_reference` with no hard size relation;
- Stage 2 dependency-injected explicit-sort completion.

## Invariants retained

- Stage 1/Stage 2 split and dependency-injected call-count seams.
- Clarification/no-result short-circuit remains before Stage 2.
- Copy-on-write session commit, generation checks, idempotency, and terminal handling remain unchanged.
- Hard constraints, comparative price/product rules, relaxation consent, grounded writer validation, and backend recommendation authority are unchanged.
- No database query or provider call was added.

## Verification

- E1–E6 focused AI regression: 65 passing tests in the targeted quality suite.
- Full focused AI/rate suite, Prisma validation, frontend tests/build, and `git diff --check` are run as final gates for this phase.

## Remaining limitations

The existing size taxonomy has no `medium` enum and retains its established `wide`/`tall` ordinal mapping. This phase only removes unsafe free-text inference; a future taxonomy redesign would require an explicit product-data migration and is out of scope.

## Go / No-Go Phase F

Go, provided all final regression gates pass. The two E7 correctness blockers are addressed without widening recommendation authority or public API behavior.
