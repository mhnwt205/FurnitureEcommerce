# Phase D4.5 — Clarification Production Audit & Hardening Review

## Scope and method

This is a read-only audit of the D4.4 production clarification path. No production code, API, schema, frontend, dependency, or database change was made. Findings cite the implementation as it exists on `codex/ai-phase-a-characterization`.

## Current pipeline

`chatWithAdvisor` validates the strict request and forwards the complete conversation result unchanged at [aiAdvisor.controller.js:4-18](../../../backend/controllers/aiAdvisor.controller.js). The public route remains `POST /chat` behind the existing 10-per-15-minute public limiter ([aiAdvisor.routes.js:7](../../../backend/routes/aiAdvisor.routes.js), [publicRateLimit.middleware.js:22](../../../backend/middlewares/publicRateLimit.middleware.js)).

Within the per-session queue, conversation resolves/rotates a session, checks cached messages, extracts and merges intent, invokes candidate preparation, then builds one summary and one policy decision ([aiConversation.service.js:61-105](../../../backend/services/aiConversation.service.js)). It returns a clarification before completion for `clarify` and `no_result_refinement` ([aiConversation.service.js:108-115](../../../backend/services/aiConversation.service.js)); otherwise it invokes completion on the same artifacts ([aiConversation.service.js:116-118](../../../backend/services/aiConversation.service.js)). Session response caching occurs after state update ([aiConversation.service.js:121-129](../../../backend/services/aiConversation.service.js)).

Stage 1 is limited to current-product lookup, retrieval, promotion enrichment, and eligibility ([aiAdvisor.service.js:749-769](../../../backend/services/aiAdvisor.service.js)). Stage 2 starts from prepared eligibility candidates and performs review aggregation, ranking, selection, and writer fallback only ([aiAdvisor.service.js:777-816](../../../backend/services/aiAdvisor.service.js)). Neither stage stores artifacts in a session model; the model contains only bounded intent, turn, cache, context, and clarification fields ([aiConversation.types.js:14-18](../../../backend/services/aiConversation.types.js)).

## Response contract

`toResponse` always serializes `answer` as a string and `recommendations` as an array, preserving additive `type`, `question`, and `canRefine` ([aiConversation.service.js:21-29](../../../backend/services/aiConversation.service.js)). Clarification builds `recommendations: []` and a single `{ field, text, options }` question ([aiConversation.service.js:112-115](../../../backend/services/aiConversation.service.js)). The question builder caps text at 300 characters and options at six ([aiClarificationQuestion.service.js:17-20](../../../backend/services/aiClarificationQuestion.service.js)). Controller forwarding does not remove additive fields ([aiAdvisor.controller.js:16-18](../../../backend/controllers/aiAdvisor.controller.js)).

The decision schema itself is strict, has closed action/field/reason enums, and bounds question members ([aiClarification.schema.js:5-12](../../../backend/services/aiClarification.schema.js)). However, runtime response construction does not parse the final question through that schema; see required hardening below.

## Policy and candidate edge cases

Policy ordering is deterministic: conflict, no-result, missing category, broad category-without-budget, then recommendation ([aiClarification.policy.js:6-13](../../../backend/services/aiClarification.policy.js)). Candidate Summary identifies primary category absence independent of fallback results and derives no-result reasons deterministically ([aiCandidateSummary.service.js:3](../../../backend/services/aiCandidateSummary.service.js)). This correctly prevents fallback products from being interpreted as category matches.

| Case | Policy/result observed | Evidence |
|---|---|---|
| Missing category | Clarify category when candidate count is not zero and category has not already been asked. | `aiClarification.policy.js:10` |
| Broad category-only | Clarify budget only above 20 candidates. | `aiClarification.policy.js:12` |
| Category + budget | Recommend; optional colors/materials do not block. | `aiClarification.policy.js:11-13` |
| Primary zero + fallback | `no_category_match`, then no-result refinement; fallback count is not used as breadth. | `aiCandidateSummary.service.js:3`; `h3.ai-candidate-policy-integration.test.js:3` |
| Budget/attribute/no active result | Summary creates canonical reason; policy uses `candidateCount === 0` for no-result refinement. | `aiCandidateSummary.service.js:3`; `aiClarification.policy.js:9` |
| Low confidence | It influences wording/reason only for missing category; it cannot alone force clarification. | `aiClarification.policy.js:10` |
| Conflict | Clarify `conflict` unless capped. | `aiClarification.policy.js:8` |
| Current product | It remains a Stage 1 input and Stage 2 ranking signal; it is not used to infer a missing category for policy. | `aiAdvisor.service.js:757-769`; `aiConversation.service.js:94-95` |

## Two-question cap

The state adapter changes a third `clarify` decision to `recommend` at count two ([aiClarification.service.js:5-7]). `recordClarification` bounds the count at two ([aiConversationMerge.service.js:35](../../../backend/services/aiConversationMerge.service.js)). Conversation preserves the current count for a capped no-result ([aiConversation.service.js:108-115](../../../backend/services/aiConversation.service.js)). Tests cover eligible recommendation and capped no-result state ([h3.ai-clarification-response.test.js:87-111](../../../backend/tests/h3.ai-clarification-response.test.js)).

**Blocker — repeated capped no-result guidance:** a repeated identical no-result request at count two still returns `type: clarification` with the same relaxation question. The counter stays at two, but there is no terminal/last-guidance marker or comparison with `lastAskedField`/reason to prevent repeated question text ([aiConversation.service.js:108-115](../../../backend/services/aiConversation.service.js)). This does not meet the no-infinite-repeat intent of the cap.

## Session, idempotency, and concurrency

The store serializes per-session work using a promise queue and removes queue entries once the tail settles ([aiConversationSession.store.js:17](../../../backend/services/aiConversationSession.store.js)). It detects the current session generation before and after candidate work ([aiConversation.service.js:98,120](../../../backend/services/aiConversation.service.js)); response cache lookup precedes processing and cache write is bounded by the turn limit ([aiConversation.service.js:84,127-128](../../../backend/services/aiConversation.service.js)). Reset receipts are checked both before and inside the queue ([aiConversation.service.js:64-71](../../../backend/services/aiConversation.service.js)).

Clarify/no-result assigns the next clarification state; recommend and recommend-and-refine use the adapter reset state ([aiConversation.service.js:121-123](../../../backend/services/aiConversation.service.js), [aiClarification.service.js:8-10](../../../backend/services/aiClarification.service.js)). Empty recommendations do not overwrite recommendation context ([aiConversation.service.js:123](../../../backend/services/aiConversation.service.js)). New, reset, TTL-expired, and rotated sessions receive a new default state ([aiConversation.types.js:14-18](../../../backend/services/aiConversation.types.js)).

**Blocker — failed Stage 1 mutates live session before commit:** intent, field metadata, exclusions, and current product are written directly to the Map-backed session before `prepareAdvisorCandidates()` at [aiConversation.service.js:89-97](../../../backend/services/aiConversation.service.js). If Stage 1 throws, the request fails but those mutations remain in the existing session. The current test only asserts that `clarificationState` remains zero after failure ([h3.ai-clarification-response.test.js:166-180](../../../backend/tests/h3.ai-clarification-response.test.js)); it does not assert that intent/exclusions/context stay unchanged. This contradicts the desired commit-after-success invariant and can affect a following turn.

## Operation integration

Conversation combines controlled D2 operation recognition with legacy extraction ([aiConversation.service.js:31-40](../../../backend/services/aiConversation.service.js)). It applies canonical append/replace/clear through merge and handles exclusion separately by removing positive values and bounding excluded arrays ([aiConversation.service.js:42-51](../../../backend/services/aiConversation.service.js)). Merge clear removes field metadata using `clearedFields` ([aiConversation.service.js:89-93](../../../backend/services/aiConversation.service.js), [aiConversationMerge.service.js:9-31](../../../backend/services/aiConversationMerge.service.js)). Production-path tests cover append, exclusion, clear, and unknown input retention ([h3.ai-clarification-response.test.js:149-163](../../../backend/tests/h3.ai-clarification-response.test.js)).

Exclusions are intentionally not enforced in candidate filtering. This is not a blocker to Phase E; it is an explicit Phase E implementation dependency. It must not be represented to users as already enforced.

## Error handling

Stage 1 errors propagate rather than becoming empty/no-result data ([aiConversation.service.js:97](../../../backend/services/aiConversation.service.js)); this preserves the retrieval-error boundary. Summary/policy failures use recommendation if eligible candidates exist and generic relaxation otherwise ([aiConversation.service.js:101-107](../../../backend/services/aiConversation.service.js)). Question-builder failure uses deterministic fallback ([aiConversation.service.js:113](../../../backend/services/aiConversation.service.js)). Stage 2 retains its writer fallback behavior ([aiAdvisor.service.js:804-812](../../../backend/services/aiAdvisor.service.js)).

Gap: summary/policy failures are silently caught with no structured warning, which hinders diagnosis but does not itself change safety. Store errors are not specifically isolated; capacity/corruption errors currently follow controller's existing 500 response path.

## Security and memory

Request lengths and IDs are bounded at the controller ([aiAdvisor.controller.js:4-12](../../../backend/controllers/aiAdvisor.controller.js)). Session records bound turns, recent turns, processed messages, and reset receipts ([aiConversation.types.js:3-5](../../../backend/services/aiConversation.types.js), [aiConversationSession.store.js:10-16](../../../backend/services/aiConversationSession.store.js)). The store caps active sessions, sweeps expired entries, evicts non-queued LRU candidates, and unrefs its cleanup interval ([aiConversationSession.store.js:3-16](../../../backend/services/aiConversationSession.store.js)).

Question templates are static/bounded and do not contain products, PII, catalog content, or model-controlled options ([aiClarificationQuestion.service.js:1-20](../../../backend/services/aiClarificationQuestion.service.js)). Policy does not accept prompt output and Gemini is not a clarification decision authority. No artifacts are placed in session state.

Audit caveat: existing logger/controller error paths can log exception stacks, but the D4.4 summary/policy path itself does not log raw message, catalog, or summary.

## Test quality

The direct call-count tests invoke the exported production Stage 1 and Stage 2 functions with injected dependencies rather than a simulated pipeline ([h3.ai-advisor-stage-call-count.test.js:1-86](../../../backend/tests/h3.ai-advisor-stage-call-count.test.js)). Conversation tests use dependency injection to prove clarify skips completion and recommend reuses artifacts ([h3.ai-clarification-response.test.js:23-65](../../../backend/tests/h3.ai-clarification-response.test.js)). This is good coverage of branch behavior, although it uses controlled artifacts and does not perform an HTTP route test exercising a real clarification response through controller.

Gaps to close before merge/production use:

1. Route/controller test for clarification response preserving `type`, `question`, empty recommendation array, and session metadata.
2. Regression test proving a Stage 1 failure leaves existing session intent, fieldMeta, excluded values, and currentProductId unchanged.
3. Repeated no-result at count two test that proves no repeated clarification question loop.
4. Runtime final response/question schema validation or equivalent defensive construction test.
5. Real-production-path test connecting actual Candidate Summary and policy with a fake Stage 1 artifact, rather than injecting policy output for every branch.

## Manual flow matrix

| User input | Existing intent | Candidate summary | Expected | Actual | Response | State transition |
|---|---|---|---|---|---|---|
| `Tư vấn giúp tôi` | empty | eligible 30 | clarify category | clarify category | clarification | count 0→1 |
| `Sofa` | empty | primary 25, eligible 25 | clarify budget | clarify budget | clarification | count 0→1 |
| `Sofa dưới 15 triệu` | empty | eligible 4 | recommend | recommend | recommendation | reset |
| `Sofa` | category sofa | eligible 5 | recommend | recommend | recommendation | reset |
| `Sofa màu kem` | category sofa | eligible 3 | recommend | recommend | recommendation | reset |
| `Sofa` | category sofa | primary 0, fallback 30 | relaxation | no-result refinement | clarification | count +1 |
| `Sofa dưới 5 triệu` | category sofa | budget after-filter 0 | relaxation | no-result refinement | clarification | count +1 |
| `Sofa màu tím` | category sofa | attribute after-filter 0 | relaxation | no-result refinement | clarification | count +1 |
| `Sofa` | category sofa | retrieved 0 | relaxation | no-result refinement | clarification | count +1 |
| `Sofa dưới 15 triệu` | category sofa, budget 20m | eligible 4 | recommend | recommend | recommendation | reset |
| `thêm màu xanh` | colors cream | eligible 4 | append | append before policy | recommendation/clarification per count | merged colors |
| `không cần màu` | colors cream | eligible 4 | clear colors only | clear colors | recommendation | colors/meta cleared |
| `không lấy màu trắng` | colors white | eligible 4 | exclude white | exclude stored | recommendation | remove positive/add exclusion |
| repeated no-result at count 2 | category sofa | eligible 0 | final non-looping guidance | repeated relaxation clarification | clarification | remains 2 |

## Verdict

### Blockers before Phase E

1. Make session intent/context updates transactional (copy-on-write or explicit commit) so failed Stage 1 does not persist partial turn state.
2. Make the two-clarification no-result cap terminal/non-repeating for identical unresolved state, with a regression test.

### Required fixes before production merge

1. Add a controller/route contract test for a real clarification response.
2. Validate final clarification response/question through the strict decision/response boundary, or prove deterministic construction cannot violate it.

### Improvements that can be deferred

- Structured warning telemetry for summary/policy fallback.
- More localized question templates for room/style/size/colors/materials when policy begins selecting those fields.
- Enforce exclusions as candidate filters in Phase E.
- Frontend session persistence and clarification UI in Phase H.

## Go / No-Go for Phase E

**No-Go until the two blockers are fixed.** The candidate/ranking work of Phase E should not build on a session that can retain failed-turn intent or a clarification state that can present repeated terminal questions.
