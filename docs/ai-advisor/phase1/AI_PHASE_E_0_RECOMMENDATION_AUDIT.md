# Phase E.0 — Recommendation Authority and Ranking Pipeline Audit

## Scope and conclusion

This is a read-only audit of the Phase D4.6 baseline. No production code, API, schema, frontend, dependency, or ranking weight was changed. The recommendation pipeline is now split cleanly enough to begin Phase E: candidate preparation is separate from recommendation completion, and conversation can short-circuit before the latter. Evidence: `backend/services/aiAdvisor.service.js:748-771`, `backend/services/aiAdvisor.service.js:781-820`, and `backend/services/aiConversation.service.js:111-150`.

**Go for E1**, provided E1 treats exclusions and explicit availability as backend-enforced constraints and adds the missing focused tests listed below. There is no blocker to starting E1. There are two material gaps that Phase E must not carry forward as accepted behavior: exclusions are stored but never applied to candidates, and stock/`stockRequired` are not eligibility constraints.

## Current recommendation pipeline

| Step | Function / evidence | Input → output | Query / mutation / authority |
| --- | --- | --- | --- |
| Structured intent | `resolveAdvisorIntent`, `backend/services/aiAdvisor.service.js:723-735`; extractor `backend/services/aiIntentExtraction.service.js:19-75` | message/context → strict canonical intent or legacy fallback | Gemini may supply taxonomy-bound intent; backend parses/validates it. |
| Session merge and operations | `processAiConversation:100-110`; merge `aiConversationMerge.service.js:7-35` | turn intent + working session → merged intent/exclusions | Copy-on-write working session only; backend authority. |
| Legacy mapping / retrieval where | `aiAdvisor.service.js:270-320` | canonical intent → legacy budget/attributes and active/category/keyword where | Backend only. Keyword matching is substring based. |
| Current-product lookup | `aiAdvisor.service.js:737-763` | optional `currentProductId` → active product | One optional Prisma lookup; only a later ranking signal. |
| Primary/fallback retrieval | `aiCandidateRetrieval.service.js:2-15`; fetch query `aiAdvisor.service.js:702-721` | where → up to 50 candidates plus origin metadata | One primary `findMany`, at most one fallback. Backend only. |
| Promotion enrichment | `aiAdvisor.service.js:737-771`; `promotionPricing.service.js:73-162` | candidates → copied candidates with effective price | Batch product/category and promotion queries; backend only. |
| Eligibility | `aiAdvisor.service.js:741-745`, invoked `:765-771` | enriched candidates → budget/attribute eligible list + diagnostics | In-memory backend filter; no mutation of Prisma rows. |
| Summary / clarification branch | `aiConversation.service.js:117-138`; summary `aiCandidateSummary.service.js:2-3` | eligible list/metadata → policy decision | Backend only; can return before Stage 2. |
| Reviews | `aiAdvisor.service.js:328-344`, Stage 2 `:781-786` | eligible IDs → review map | One batch `review.groupBy`; backend only. |
| Ranking, sort, selection | `aiAdvisor.service.js:465-485`, `:775-778`, `:784-789` | eligible candidates → score-sorted top five | Backend only; deterministic only while upstream order is deterministic. |
| Writer and DTO | `aiAdvisor.service.js:488-522`, `:628-700`, `:789-815` | selected DTOs → answer/reason overlay | Gemini can word output, not select products. Backend owns DTO. |
| Response/session context | `aiConversation.service.js:140-150` | result → cached public response/session context | Backend only; artifacts are not stored in session. |

Stage 1 is candidate preparation (`prepareAdvisorCandidates`, `aiAdvisor.service.js:748-771`) and does not aggregate reviews, score, select, or call Gemini. Stage 2 (`completeAdvisorRecommendation`, `:781-815`) consumes the Stage-1 artifact and does not retrieve, enrich, or filter again. The direct dependency-injection proof is in `backend/tests/h3.ai-advisor-stage-call-count.test.js:4-5`.

## Authority boundary

Backend authority is complete for candidate IDs, active-product retrieval, promotion applicability/effective price, eligibility, review aggregation, score/order, top-N and DTO fields (`aiAdvisor.service.js:702-815`; `promotionPricing.service.js:73-162`). Gemini has two bounded roles: strict taxonomy extraction (`aiIntentExtraction.service.js:19-60`) and response wording from selected DTOs only (`aiAdvisor.service.js:628-686`).

The writer receives only selected `allowedProducts` (`aiAdvisor.service.js:586-648`). Its returned recommendation IDs are filtered against the backend allow-list and only string reasons survive (`:683-686`); the backend retains the original DTO order and maps only allowed reasons back onto it (`:789-815`). It therefore cannot add IDs, change price/stock/DTO fields, reorder items, or remove every selected item.

Residual trust risk: the free-form `answer` and an allowed-ID `reason` are type-checked but not fact-checked against the selected DTO. Prompt instructions forbid invention (`:630-641`), but this is not enforcement. Treat factual explanation templates/claim validation as an E6 hardening requirement, not as a reason to let Gemini control ranking.

## Hard filters actually present

| Constraint | Current behavior | Evidence / risk |
| --- | --- | --- |
| Active | Prisma `isActive: true` in all retrieval paths | `aiAdvisor.service.js:302-320`, `:702-721`; hard. |
| Category | Primary query exact category slug; category fallback repeats the category slug | `:302-306`, `aiCandidateRetrieval.service.js:6-8`; hard for a recognized category. Summary deliberately preserves a primary-zero category miss (`aiCandidateSummary.service.js:3`). |
| Keyword | Prisma `contains` OR over text fields when no category; fallback may become all active | `aiAdvisor.service.js:307-317`, `aiCandidateRetrieval.service.js:9-13`; not hard end-to-end. |
| Budget | Inclusive effective-price in-memory filter | `aiAdvisor.service.js:458-463`, `:741-745`; hard whenever a parsed budget intent exists. |
| Color/material/room/style/dimensions | In-memory exact composite match after budget; fields use substring/text matching and dimension tolerance | `:379-401`, `:741-745`; currently hard when expressed as recognized attributes, despite some being conceptually preferences. |
| Size word | Influences `hasAttributes` but is not part of `exact` | `:388-401`; can trigger empty result where no exact color/material/room/style/dimension exists, but alone does not require a size match. |
| Stock | No eligibility filter | `aiAdvisor.service.js:469`, `backend/tests/h3.ai-characterization.test.js:132-136`; soft only. |
| Exclusions | Persisted in session only | `aiConversation.service.js:56-60`, `aiConversation.types.js:16-18`; never passed to Stage 1. |
| Current product | No filter/inference; +8 same-category ranking signal | `aiAdvisor.service.js:472`, `:737-763`. |
| Promotion | Enrichment/effective price, not a predicate | `promotionPricing.service.js:107-162`. |
| Unknown taxonomy | Strict intent schema rejects unknown canonical values | `aiIntent.schema.js:18-31`; operation recognizer does not insert unknown values (`h3.ai-conversation-operation.test.js:5`). |

Out-of-stock products remain eligible and serializable. Negative/null stock has no explicit validation: it simply misses the `stock > 0` bonus. `stockRequired` is present in intent/session (`aiConversation.types.js:10`, `aiConversationMerge.service.js:19`) but is not consumed by candidate preparation or scoring.

## Soft scoring and order

| Factor | Score / behavior | Hard or soft | Evidence | Risk |
| --- | --- | --- | --- | --- |
| In stock | +30 if `stock > 0` | soft | `aiAdvisor.service.js:469` | Zero/negative-stock item can still rank/return. |
| Exact category | +25 | soft after retrieval | `:470` | Redundant for recognized category retrieval. |
| Within budget | +20 | hard filter first, soft bonus second | `:471`, `:741-745` | Redundant but harmless. |
| Same category as current product | +8 | soft | `:472` | Does not infer current-product category. |
| Keyword | +7 per matched keyword | soft | `:474-476` | Substring/token behavior can reward incidental text. |
| Attributes | colors/materials +20 field / +10 text; room +18/+8; style +16/+8; size +5; dimension +25/+14 | soft after prior eligibility | `:404-433`, `:478` | Most attributes already filtered hard, except size wording. |
| “cheap/saving” hint | `max(0, 10 - effectivePrice/1m)` | soft | `:480-482` | Negative effective price could exceed +10 if corrupt data. |
| Review count | +min(reviewCount, 10) | soft | `:484` | Rating is fetched/serialized but does not affect score. |
| Promotion | no direct score; only affects effective price / cheap hint | soft indirect | `promotionPricing.service.js:107-162`, `aiAdvisor.service.js:480-482` | Promotion does not independently rank. |
| Fallback origin | no score/penalty | neither | `aiCandidateRetrieval.service.js:2-15`, score `:465-485` | Keyword all-active fallback can rank unrelated items. |

Sorted by score descending, then raw stock descending, then effective price ascending (`aiAdvisor.service.js:776`). No final ID tie-breaker exists. JavaScript sort is stable, but equal-score/equal-stock/equal-price outcomes retain the retrieval order, which is `stock desc`, `price asc`, `createdAt desc` from Prisma (`:716-720`) and may still be non-deterministic on equal `createdAt`. Scores are non-negative under normal non-negative price data; corrupt negative price can inflate the cheap hint.

## Effective price and money semantics

`getEffectivePrice` resolves `finalPrice`, then `displayPrice`, then `price` and converts with `Number` (`aiAdvisor.service.js:436`). Budget tests are inclusive (`:458-463`), Candidate Summary min/max uses `finalPrice ?? effectivePrice ?? price` with integer-only acceptance (`aiCandidateSummary.service.js:2-3`), and DTO `price`/`finalPrice` both expose effective price (`aiAdvisor.service.js:488-498`).

Promotion enrichment loads active scheduled/active promotions with `startAt <= new Date()` and `endAt >= new Date()` (`promotionPricing.service.js:73-104`), then chooses highest priority, largest discount, earliest end, then lowest promotion ID (`:53-71`). Percentage and fixed discounts are supported (`:41-50`); values are rounded to two decimals and clamped non-negative (`:17`, `:107-149`). This produces numeric VND values, but not a strict integer invariant for percentage prices. D4.2’s summary schema requires integer prices, so fractional promotion results are a data-contract risk; tests cover a whole-number percentage promotion, not fractional VND. Missing price becomes zero in scoring/serialization fallback (`aiAdvisor.service.js:436`), while pricing normalizes `product.price` through `Number` (`promotionPricing.service.js:158-162`).

Audit cases: no promotion retains base price; 10% promotion uses final price (characterization test `h3.ai-characterization.test.js:110-118`); fixed discount is supported by pricing service but lacks advisor-path test; zero is clamped by promotion calculation, while negative source price is not independently rejected before enrichment; exact max budget is included by `>` comparison at `aiAdvisor.service.js:461`. Promotion time is server-local `new Date()`; no explicit business timezone is applied.

## Stock and exclusion readiness

Default stock policy today is preference-only: retrieve all active products, add +30 to in-stock, and keep out-of-stock DTOs possible (`aiAdvisor.service.js:469`, `:488-522`; characterization proof `h3.ai-characterization.test.js:132-136`). No `out_of_stock_only` summary reason exists (`aiCandidateSummary.schema.js:1-3`). E1 should make `stockRequired: true` a hard `stock > 0` eligibility predicate while retaining the current soft in-stock preference for ordinary requests; a direct product query should truthfully show unavailable status rather than invent no result. Add `out_of_stock_only` only when a pre-stock candidate set is non-empty and the stock-required set is empty.

Exclusions are canonical/bounded session state: exclude moves a matching positive color/material into `excluded` and removes it from positive intent (`aiConversation.service.js:56-60`), and `updateExcluded` deep-clones/deduplicates with max five (`aiConversationMerge.service.js:38-42`). They are absent from the Stage-1 input and Candidate Summary, so they cannot filter/rank or explain no results. E1 should apply explicit category/color/material/style exclusions as hard eligibility filters **after promotion/before current attribute eligibility diagnostics**, producing a distinct exclusion diagnostic/reason. A penalty is insufficient for an explicit “không lấy”.

## Comparative-context readiness

The stored context is intentionally minimal: selected IDs, effective min/max price, category, up to five dominant colors, and `dominantSize` (currently not populated) (`aiConversation.types.js:17`; update only after actual recommendations `aiConversation.service.js:142`). It is enough to seed future reference resolution, not enough to implement comparative behavior now.

| Phrase | Current recognition / state | Phase E need |
| --- | --- | --- |
| “rẻ hơn”, “đắt hơn” | unsupported parser regression (`h3.ai-characterization.test.js:83-87`); min/max exists | reference-price operation and explicit comparator rule. |
| “màu khác” | unsupported; dominant colors exists | turn selected colors into exclusions or reference-color comparator. |
| “nhỏ hơn” | unsupported; `dominantSize` remains null | persist normalized dimensions/size of selected reference. |
| “mẫu khác” | unsupported; IDs exist | exclude prior IDs in Stage 1. |
| “mẫu thứ hai” | unsupported; IDs are ordered but no ordinal parser | reference-index parser with bounds/clarification. |
| “giống mẫu trước” | no structured reference | selected-product attribute snapshot and similarity scoring. |
| “còn hàng không” | `stockRequired` exists but not applied | availability intent + direct/reference-product behavior. |

## No-result, diversification, and performance

Summary reasons are deterministic: primary zero for requested category → `no_category_match`; zero retrieval → `no_active_product`; budget/attribute diagnostic drops → their respective reason; otherwise zero eligible → `unknown` (`aiCandidateSummary.service.js:3`). The fallback count is not used to claim category match; covered in `h3.ai-candidate-summary.test.js:3`. There is no exclusion or stock cause yet. Phase E relaxation must not silently drop explicit category, budget, stock-required, or exclusion constraints; suggested discussion order is optional preferences → explicitly consented budget change → category change.

Top-N is five (`aiAdvisor.service.js:8`, `:777`). IDs are naturally unique from product retrieval, but there is no diversity rule for variants, style, color, or price band; five near-identical products can occupy all slots. Out-of-stock items can occupy a slot. E6 can add deterministic, explainable diversity only after hard constraints and base ordering are locked.

Current request cost is at most two product `findMany` retrieval calls, optional current-product lookup, promotion enrichment that itself performs a product lookup plus promotion query (`promotionPricing.service.js:73-104`), then one review `groupBy` only if Stage 2 runs (`aiAdvisor.service.js:328-344`). Candidate retrieval is capped at 50 (`:8-9`, `:702-721`) and sort is O(n log n). Clarification short-circuit avoids reviews/ranking/writer (`h3.ai-clarification-response.test.js:23-43`). E1 stock/exclusion filters can reduce Stage-2 work; avoid a second Prisma count/query and retain Stage-1 diagnostics.

## Security, test quality, and required tests

Prompt injection is explicitly treated as data by the intent prompt (`aiIntentExtraction.service.js:19-36`), strict taxonomy rejects unknown model fields (`aiIntent.schema.js:18-31`), and the writer receives selected data only. Session artifacts are not stored; only bounded intent/context/turn/cache state is committed (`aiConversation.service.js:140-148`). Question options are bounded and canonical (`aiClarification.schema.js:19-23`). Nevertheless, selected DTO descriptions/attributes are sent to Gemini writer (`aiAdvisor.service.js:586-617`), and natural-language writer claims are not grounded field-by-field; do not treat model prose as authority.

Existing tests prove baseline parsing, effective price, stock influence, out-of-stock serialization, Gemini ID allow-list, retrieval metadata, summary reasons, stage DI call order, and clarification short-circuit (`h3.ai-characterization.test.js:73-165`; `h3.ai-candidate-retrieval.test.js:3-6`; `h3.ai-candidate-summary.test.js:3-5`; `h3.ai-advisor-stage-call-count.test.js:4-5`; `h3.ai-clarification-response.test.js:23-83`). Gaps to add before or with E1:

1. Hard stockRequired and explicit exclusions, including category/color/material/style and no-result diagnostics.
2. Exact budget lower/upper boundary after fractional percentage and fixed promotions.
3. Ranking fixtures that lock every score factor, fallback-origin behavior, equal-score tie-breaker, and out-of-stock competition.
4. Writer answer/reason factual-claim containment, not merely ID/type validation.
5. Comparative Vietnamese cases, ordinal bounds, and reference-context lifecycle.
6. Diversity and no-result relaxation tests that prove no silent hard-constraint relaxation.

## Proposed Phase E roadmap

| Step | Scope / likely files | Tests / done criterion |
| --- | --- | --- |
| E1 | Enforce canonical exclusions and `stockRequired` in Stage-1 eligibility; add diagnostics/reasons | `aiAdvisor.service.js`, summary service/schema, tests; no excluded or unavailable product survives explicit hard constraints. |
| E2 | Codify hard-vs-soft classifier and deterministic tie-breaker | eligibility/ranking service/tests; parser wording maps to explicit policy. |
| E3 | Extract comparative references from canonical session context | intent/conversation operation/types/tests; no raw-message-only state. |
| E4 | Apply comparative filters/scoring without changing authority | Stage 1/Stage 2/tests; reference IDs and price/color/size semantics are bounded. |
| E5 | Extend no-result reasons and consent-based relaxation | summary/clarification/tests; never silently relax hard constraints. |
| E6 | Deterministic diversification and backend-grounded explanations | ranking/writer adapter/tests; unique, explainable top-N. |
| E7 | Audit/hardening of ranking authority, performance and Vietnamese evaluations | reports and regression matrix; no authority regressions. |

## Manual flow matrix

| User input | Existing intent | Candidate summary | Expected / actual action | Response / state |
| --- | --- | --- | --- | --- |
| “Tư vấn nội thất” | empty | candidates > 0 | clarify category / clarify | clarification; count +1. |
| “Sofa dưới 15 triệu” | empty | category match, eligible > 0 | recommend / recommend | recommendation; state reset. |
| “Sofa” with 25 eligible | empty | eligible 25 | clarify budget / clarify | clarification; count +1. |
| “Sofa” with 5 eligible | empty | eligible 5 | recommend / recommend | recommendation. |
| Unknown category with fallback rows | category requested | primary 0, fallback 30 | no category match / no-result refinement | relaxation clarification, never broad-budget interpretation. |
| Sofa below budget with zero after budget | category sofa | budget drop | no budget match / no-result refinement | relaxation; no fabricated product. |
| Sofa cream with no exact match | color cream | attribute drop | no attribute match / no-result refinement | relaxation. |
| No active products | empty | retrieved 0 | no active product / no-result refinement | relaxation. |
| “Không lấy màu trắng” | cream | exclusion white | persist only / persist only | current gap: filtering waits for E1. |
| “Cần còn hàng” | stockRequired true | candidates include stock 0 | should hard-filter / currently soft | E1 gap. |
| “Màu khác” | prior dominant cream | parser unsupported | clarification/reference needed | no comparative behavior now. |
| Third no-result after two questions | unchanged | eligible 0 | terminal / terminal | `no_result`, count remains two (`h3.ai-clarification-terminal.test.js:11-21`). |

## Blockers and Go/No-Go

There is **no blocker to beginning E1**. The required E1 implementation outcomes are: enforce exclusions; implement `stockRequired`; retain the one-query Stage-1 artifact model; add diagnostics before/after each new hard filter; and test exact price/stock/no-result paths. Do not claim Phase E recommendation authority is complete until writer claim grounding, deterministic final tie-breaking, and comparative reference semantics are addressed.
