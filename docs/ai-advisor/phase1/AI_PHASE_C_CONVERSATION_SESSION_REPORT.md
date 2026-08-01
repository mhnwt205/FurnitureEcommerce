# Phase C — Conversation Session Contract

## Scope and boundary

Phase C adds only the backend conversation contract and an in-memory state layer. It does not add Prisma, Redis, migrations, frontend state/localStorage, clarification responses, new ranking weights, stock hard filters, or a changed recommendation DTO. The controller remains the request-validation boundary at `backend/controllers/aiAdvisor.controller.js:4-18`; recommendation retrieval and Gemini response wording remain in `backend/services/aiAdvisor.service.js:736-843`.

## Session architecture and lifecycle

`AiConversationSessionStore` is a process-local `Map` store (`backend/services/aiConversationSession.store.js:3-22`). New sessions use `crypto.randomUUID()` (`backend/services/aiConversation.types.js:14-18`) and have `ownerUserId`, timestamps, empty structured intent, per-field metadata, exclusions, minimal recommendation context, bounded idempotency map, and recent turn summaries.

- TTL is 24 hours of inactivity (`AI_SESSION_TTL_MS`, `backend/services/aiConversation.types.js:3`); expiration is removed lazily on `get` (`backend/services/aiConversationSession.store.js:6-10`).
- A session has at most 20 user turns (`backend/services/aiConversation.types.js:4`); turn 21 rotates to a fresh ID (`backend/services/aiConversation.service.js:23-28`).
- `resetSession: true` or a normalized reset phrase rotates to a new session and processes the non-empty current message in it (`backend/services/aiConversationReset.service.js:1-3`, `backend/services/aiConversation.service.js:23-28`).
- This intentionally loses sessions on Render restart and cannot coordinate multiple backend instances. Phase D can rely on the internal contract, while a future deployment phase can replace only the store implementation with Redis or persistent storage.

## Request/response compatibility

Existing request fields remain valid. Optional `sessionId`, `clientMessageId` (1–64 chars), and `resetSession` were added by strict Zod validation (`backend/controllers/aiAdvisor.controller.js:4-12`). A normal result preserves `answer` and `recommendations` and adds ignored-by-old-client fields `sessionId` and `session` (`backend/services/aiConversation.service.js:16,41-44`). No `type`, clarification payload, or required frontend field has been introduced.

## Intent merge

The orchestrator resolves a turn, merges it before calling the existing advisor, then saves the result (`backend/services/aiConversation.service.js:31-43`). Scalars retain an absent value and overwrite only with a valid supplied value; arrays replace by default, canonical-dedupe, and cap at five; budget replaces rather than intersects (`backend/services/aiConversationMerge.service.js:7-33`). Field metadata has source priority `explicit_user > gemini_nlu > legacy_parser > derived_context` (`backend/services/aiConversationMerge.service.js:3,10`). Exclusion storage exists in the session shape and merge helper (`backend/services/aiConversation.types.js:16`, `backend/services/aiConversationMerge.service.js:36-40`), but Phase C does not yet recognize Vietnamese negation—this is deferred to Phase D/E.

## Ownership, concurrency, and idempotency

The public endpoint passes `req.user?.id ?? null` as owner (`backend/controllers/aiAdvisor.controller.js:17`). A supplied session is reused only when owner values match; a foreign or invalid/expired ID gets a new opaque session (`backend/services/aiConversation.service.js:18-21`). Thus an authenticated owner cannot claim a guest session, and user B does not read user A’s stored context.

Each session is serialized through a per-session promise queue; queues are removed when the tail settles (`backend/services/aiConversationSession.store.js:11-19`). `clientMessageId` caches the exact response inside the session before any re-run, bounded to 20 entries (`backend/services/aiConversation.service.js:29,41-43`).

## Recommendation context

After backend recommendations are returned, the session stores only IDs (up to five), min/max effective price, first category, up to five colors, and `dominantSize: null` (`backend/services/aiConversation.service.js:11-14,38`). It deliberately does not persist the full DTO, price catalog, secret, or raw model output. Phase C stores this future reference context but does not yet interpret “rẻ hơn”, “màu khác”, or ordinal references.

## Tests and characterization

`backend/tests/h3.ai-conversation.test.js` covers creation/reuse, scalar and budget merge, array replacement/dedupe, source priority, idempotency, reset/ownership/TTL/turn rotation, minimal recommendation context, and concurrent requests. It injects a store, resolver, and advisor engine—no database or network is used. The Phase B valid-NLU-to-existing-filter characterization is in `backend/tests/h3.ai-intent.test.js`; legacy parser fallback and provider resilience remain covered by the Phase A/B suites.

Focused command passed on 2026-08-01:

```powershell
node --test tests/h3.ai-conversation.test.js tests/h3.ai-characterization.test.js tests/h3.ai-intent.test.js tests/h3.ai-resilience.test.js tests/h1.rate-limit.test.js
```

Result: 34 passed, 0 failed, 0 skipped. Mocks supply all Gemini behavior; no live Gemini or database was contacted.

## Known limitations and Phase D readiness

- Session IDs are backend-only in Phase C; the existing frontend does not persist/replay them until Phase H.
- Guest ownership is bearer-by-session-ID. Secure UUID entropy prevents practical enumeration, but it is not authenticated identity proof.
- No history is sent to Gemini in Phase C. Only merged deterministic intent affects retrieval.
- Intent extraction cannot yet reliably mark explicit clear, append, exclusion, comparison, or conflict operations; the merge layer supports the storage primitives but Phase D must add controlled recognition and clarification policy.
- The current legacy parser has no source-level “around budget” metadata in the structured schema, so rule-based wording can describe its saved numeric range rather than its original “around” phrasing. Retrieval remains on the same min/max range; Phase D should decide whether an internal budget-operation field is warranted without changing the public contract.

Phase C is ready for Phase D after Phase D treats the above operation recognition and clarification logic as new behavior, rather than assuming it already exists.
