# Phase D4.6 — Clarification Session Hardening

## Findings addressed

D4.6 resolves the D4.5 blockers: partial session mutation on failed work and repeated no-result clarification after the two-question cap. It also adds strict internal response validation and controller contract coverage. No database, Prisma schema, frontend, ranking behavior, candidate filtering, or dependency was changed.

## Copy-on-write design

Conversation now retains the stored session as the generation reference, creates a deep working copy, and performs intent merge, operations, context changes, candidate preparation, policy, response construction, and idempotency-cache construction only on the working copy. The store exposes `cloneSessionForWork`, `prepareSessionForCommit`, and compare-current `commitSession`.

The stored Map entry is replaced only when the original id and generation are still current. Queue metadata remains separate from session data. Candidate artifacts and provider data are not session fields and are never committed.

## Failure rollback

- Stage 1, candidate-summary validation, and unrecoverable Stage 2 failures do not commit any turn mutation.
- Final response schema failure does not commit intent, metadata, exclusions, current product, turn count, or idempotency cache.
- Policy failure retains the existing safe fallback behavior: recommendation when candidates exist, deterministic no-result when none exist; successful fallback commits only its final working state.
- Question-builder failure falls back deterministically before response validation and commit.
- Stale generation fails the compare-current commit and cannot revive the old session.

## Terminal no-result design

`clarificationState` now contains `terminal` and `terminalReasonCode` in addition to the bounded count and asked-field metadata.

- Counts 0 and 1 may issue normal clarification.
- At count 2 with eligible candidates, recommendation proceeds and resets state.
- At count 2 with zero eligible candidates, the response is `type: "no_result"`, `terminal: true`, `recommendations: []`, and has no question.
- Repeated unchanged no-result turns preserve terminal state and return stable guidance without calling the question builder.
- A meaningful canonical change to intent, exclusions, or current-product context clears terminal state before policy evaluation. Reset, expiration, and rotation create a fresh default terminal state.

## Response schemas

Strict Zod internal response schemas were added for recommendation, clarification, and terminal no-result responses. They require a UUID session id, valid session metadata, bounded questions for clarification, additive recommendation fields, and terminal-only no-result fields. Unknown top-level keys are rejected. Response validation happens before the session commit.

## Route/controller contract

`createChatWithAdvisor` is a small dependency-injection factory used by the existing production `chatWithAdvisor` default. It permits HTTP-level controller tests without contacting Gemini or a database. The test proves the controller preserves clarification, recommendation, and terminal no-result additive fields at HTTP 200.

## Call-count invariants

Existing direct Stage 1/Stage 2 injection tests remain the proof that preparation does not run review/ranking/writer and completion does not retrieve/enrich/filter. D4.4 branch tests remain intact: clarification calls completion zero times; recommendation reuses the prepared artifacts once. Terminal no-result calls no question builder and no Stage 2.

## Tests

New coverage includes:

- full deep-equality rollback after Stage 1 failure;
- rollback after invalid final response schema validation;
- terminal no-result with no repeated question generation;
- terminal clearing on meaningful intent change;
- controller HTTP contracts for all three response variants.

The focused AI/rate regression, Prisma validation, frontend tests/build, and `git diff --check` are run as final verification.

## Remaining limitations

- Sessions remain bounded in-memory state and do not survive restart or multi-instance deployment.
- Exclusions are stored but not enforced in candidate filtering; that work belongs to Phase E.
- The existing frontend ignores additive session/clarification fields until Phase H.
- Summary/policy fallback observability can be improved later with structured non-sensitive warnings.

## Go / No-Go Phase E

Go, subject to the focused verification recorded for this phase: failed requests are transactional, terminal no-result does not loop questions, responses are strictly validated internally, and the controller preserves additive contracts.
