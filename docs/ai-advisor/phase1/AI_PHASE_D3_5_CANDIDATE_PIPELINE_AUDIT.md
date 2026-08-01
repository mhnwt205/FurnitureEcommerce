# D3.5 — Candidate Pipeline Audit

## Kết luận

**Go có điều kiện cho D4.** Điểm tích hợp phù hợp là sau eligibility filtering và trước review aggregation/ranking/writer (phương án C). D4 cần tách tối thiểu pipeline hiện tại thành retrieval summary và final ranking để reuse cùng list, đồng thời phải giữ metadata primary/fallback.

## Pipeline thực tế

1. Controller validate: `backend/controllers/aiAdvisor.controller.js:4-18`.
2. Session resolve, intent extraction/merge: `backend/services/aiConversation.service.js:18-42`.
3. Legacy mapping/filter construction: `backend/services/aiAdvisor.service.js:736-746`.
4. Optional current-product `findFirst`: `:754-756`.
5. Primary `product.findMany`, `take: 50`, active/category/keyword where: `:701-720,758`.
6. Fallback category/all-active/attribute retrieval: `:760-780`.
7. Review summary and promotion enrichment: `:783-790`.
8. Budget and attribute eligibility: `:792-812`.
9. Score/sort/top-five/serialization: `:794-824`.
10. Gemini writer then response: `:826-843`.

## Candidate counts

| Count | Current availability | D4 use |
|---|---|---|
| rawDatabaseCount | `products.length` immediately after primary query; capped at 50 | diagnostics only |
| retrievedCandidateCount | `products.length` after fallback | never use alone for category breadth |
| eligibleCandidateCount | budget-filtered plus attribute exact filtering, not currently named | broad/no-result policy |
| rankedCandidateCount | `rankedProducts.length` before slice | recommendation feasibility |
| recommendationCount | final `recommendations.length` | response only |

Budget eligibility requires promotion enrichment because `budgetMatches` uses effective/final price (`backend/services/aiAdvisor.service.js:792-794,818-819`). Review aggregation and Gemini writer are unnecessary for clarification count; ranking is unnecessary for a pure count.

## Retrieval/fallback and no-result

Primary fallback has no metadata today. If primary category query is zero, lines `760-780` can replace it with active products; `products.length` then no longer means category matches. D4 must preserve `{ primaryCount, fallbackUsed, fallbackReason, retrievedCount, eligibleCount }` and never treat fallback active products as broad category candidates.

Proposed no-result reasons: primary zero with category `no_category_match`; post-budget zero `no_budget_match`; post-attribute exact zero `no_attribute_match`; active set zero `no_active_product`; query exception `retrieval_failure`; otherwise `unknown`. Stock is currently scoring, not a hard filter, so `out_of_stock_only` cannot be concluded without a new explicit count/filter.

## Integration alternatives

- **A before Prisma:** cheapest, but cannot know broadness/no-result.
- **B after retrieval:** avoids enrichment/ranking, but price budget counts may be wrong because promotions are not applied.
- **C after promotion + eligibility, before reviews/ranking/writer:** recommended. It gives correct price/attribute eligibility and avoids review aggregation, scoring, sort, top-N and writer for clarification.

## One-query reuse design

Extract a private/internal `retrieveAdvisorCandidates` seam returning primary list, fallback metadata and priced eligible products. D4 calls it once. Clarify returns immediately; recommend passes the same eligible products to review/ranking serialization. Do not refetch after decision. Current `getAdvisorResponse` is monolithic (`backend/services/aiAdvisor.service.js:736-843`), so this extraction is the minimal D4 refactor.

## Current product context and performance

`currentProductId` causes one extra active `findFirst` and is used in ranking (`backend/services/aiAdvisor.service.js:754-756,797`). It does not infer category today. Normal request has one primary query, up to one fallback query, optional current-product query, review batch, promotion enrichment, one NLU call (up to two attempts), and writer call (up to two attempts). Candidate list is capped at 50; sort is O(n log n).

## D4 tests/blockers

Need injected retrieval seam to assert Prisma retrieval count one, writer zero on clarify, same list reuse on recommend, correct fallback origin, and no-result reason. Blocker: do not use post-fallback `products.length` as category candidate count. No other blocker for D4.
