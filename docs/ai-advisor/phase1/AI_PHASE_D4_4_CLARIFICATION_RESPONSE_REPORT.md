# Phase D4.4 — Clarification Response and Short-Circuit Pipeline

## Scope

Phase D4.4 enables the backend clarification response while preserving the existing public request shape and recommendation authority. It uses the completed Stage 1/Stage 2 split; no database schema, frontend, ranking weight, or external provider contract was changed.

## Pipeline before and after

Before D4.4, conversation invoked the complete advisor pipeline before internal clarification metadata was recorded. The new production path is:

1. Resolve/reset session and idempotency receipt, then enter the per-session queue.
2. Extract and merge the turn intent, including controlled operation recognition.
3. Run `prepareAdvisorCandidates()` once (retrieval, pricing enrichment, eligibility).
4. Build one Candidate Summary and call the policy/state adapter once.
5. For `clarify` or `no_result_refinement`, create a deterministic question and return immediately.
6. For `recommend` or `recommend_and_refine`, call `completeAdvisorRecommendation()` once using the same prepared artifacts.
7. Commit session state only after the session generation remains current, cache any client-message response, and return the additive response.

## Clarification short-circuit

Clarification and no-result paths do not invoke Stage 2. Consequently they do not aggregate reviews, rank, select top-N, build recommendation DTOs, or call the Gemini response writer. Candidate retrieval, promotion enrichment, and eligibility happen only once in Stage 1.

## Recommendation reuse

Recommendation paths pass the Stage 1 artifact directly to Stage 2. Stage 2 has no retrieval, promotion, eligibility, or current-product dependency, so it cannot refetch candidates. Existing writer allow-list and fallback handling remain in Stage 2.

## Response contracts

All successful responses retain `answer`, `recommendations`, `sessionId`, and `session`.

- Recommendation adds `type: "recommendation"` and `canRefine`.
- Clarification adds `type: "clarification"`, always returns `recommendations: []`, and contains one bounded `question` object (`field`, text no longer than 300 characters, at most six options).

Internal intent, candidate summary, retrieval metadata, and artifacts are never exposed.

## No-result behavior

No-result uses `type: "clarification"` and `question.field: "relaxation"`; it does not invent products or silently relax constraints. Deterministic wording distinguishes category, budget, attribute, and no-active-product reasons where the Candidate Summary identifies one.

## Two-question limit

At counts zero and one, the policy may request clarification. With count two and eligible candidates, the policy forces recommendation. With no eligible candidates, the backend returns final deterministic guidance without increasing the count above two, preventing a question loop.

## Session, idempotency, and concurrency

The implementation keeps Phase C.6 generation checks, queue serialization, TTL, bounded storage, reset receipts, and per-session processed-message cache. Cached sequential and concurrent duplicate requests return the stored response and do not run Stage 1, summary, policy, or question construction again. Clarification state is committed only after successful work and a current-generation check. Empty clarification/no-result results do not overwrite `lastRecommendationContext`.

## Operation integration

The conversation merge path now combines the controlled D2 recognizer with legacy extraction:

- explicit value: replace;
- `thêm`/`cũng`/`hoặc thêm`: append;
- clear phrases: clear only the named field and its metadata;
- exclusion phrases: store canonical exclusions and remove matching positive color/material values;
- omitted or unknown taxonomy values: retain existing state.

Exclusions are stored in session state only. Enforcement in candidate filtering remains deferred to Phase E.

## Direct call-count evidence

`h3.ai-advisor-stage-call-count.test.js` calls the actual production Stage 1 and Stage 2 functions with injected dependencies. It proves Stage 1 calls retrieval, pricing enrichment, and eligibility once without Stage 2 operations, and Stage 2 calls review aggregation, ranking, selection, and writer once without Stage 1 operations.

`h3.ai-clarification-response.test.js` proves conversation-level branching directly: clarify/no-result runs prepare, summary, policy, and question exactly once while completion remains zero; recommend reuses the same artifact and completes exactly once.

## Tests

Focused backend AI/rate regression: 63 passing, 0 failing. It includes the Phase A–D4.3 suites, direct stage call-count tests, clarification response, duplicate/concurrency, no-result, operation, and Gemini resilience tests. Prisma validation, frontend tests, frontend build, and `git diff --check` are also required verification steps for this phase.

## Known limitations

- The current frontend deliberately ignores additive clarification fields and does not persist `sessionId`; Phase H owns the multi-turn UI and localStorage work.
- Sessions remain in-memory and therefore do not survive restart or scale across instances.
- Exclusions are retained canonically but are not yet a candidate hard-filter; that is Phase E work.
- Optional authentication middleware is not added; live public sessions are guest sessions unless a caller supplies the existing request user context.

## Readiness for D4.5 audit

Ready for audit: the production branch point is test-proven, Stage 2 is skipped for clarification, and recommendation behavior continues through the existing Stage 2 implementation.
