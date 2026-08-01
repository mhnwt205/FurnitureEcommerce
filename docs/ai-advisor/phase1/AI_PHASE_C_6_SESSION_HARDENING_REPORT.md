# Phase C.6 — Conversation Session Hardening

## Findings addressed

Phase C.6 addresses only the four Phase C.5 blockers: stale session references during reset/rotation, reset idempotency, unbounded in-memory state, and omitted-vs-clear preference semantics.

## Race and generation control

Sessions now carry a random `generation` token (`backend/services/aiConversation.types.js`). The conversation service queues using the supplied session ID, then resolves the live session **inside** the queue (`backend/services/aiConversation.service.js`). `AiConversationSessionStore.isCurrent` and `touch` use the ID/generation pair, preventing stale objects from refreshing current state (`backend/services/aiConversationSession.store.js`). A queued request after reset/rotation resolves from the store again and creates a fresh session rather than mutating the deleted object.

## Reset idempotency

The store has a bounded, 15-minute reset receipt registry keyed by owner + original session ID + `clientMessageId`. A reset duplicate checks the receipt both before and after it enters the old-ID queue; it returns a structural clone of the original replacement response and cannot rerun NLU/retrieval (`backend/services/aiConversationSession.store.js`, `backend/services/aiConversation.service.js`). Receipts contain only the existing response, no raw message.

## Bounded lifecycle

`AI_ADVISOR_MAX_SESSIONS` has a validated optional range and default of 1000. Before creation the store sweeps expired unlocked sessions, then evicts least-recently-used unlocked sessions until under cap. A five-minute cleanup interval is `unref()`ed; `shutdown()` clears timer/maps for tests/process cleanup. Sessions, queue entries, reset receipts, idempotency records (20/session), and recent turns (4/session) are bounded.

## Field operations

Internal merge operations now distinguish `retain`, `replace`, `append`, and `clear`. Omitted/empty model arrays retain old values. Minimal normalized clear phrases are recognised only for colors, materials and budget: `không cần màu`, `bỏ màu cũ`, `xóa màu`, `không cần chất liệu`, `bỏ ngân sách`, `không giới hạn ngân sách`. Clear removes the field value and field metadata without changing unrelated fields. This is internal only; request/response contracts remain unchanged.

## Compatibility and limitations

Existing `{ message, context }` requests remain valid and responses retain `answer`/`recommendations`; `sessionId` remains additive. No frontend, database, ranking, clarification, authentication middleware, or provider contract was changed.

The public route still has no optional-auth middleware, so live ownership currently operates as guest unless upstream supplies `req.user`. In-memory sessions still disappear on restart and are not multi-instance safe. Natural-language append/exclusion/comparative interpretation remains Phase D/E work.

## Verification

Focused AI/rate suite: 36 passed, 0 failed; includes session cap/eviction/sweep and retain/clear regression tests. Prisma validation, frontend tests/build, and `git diff --check` were also run. No Gemini call, production database, migration, staging, commit, or push occurred.

## Go/No-Go

**Go for Phase D foundation**, subject to Phase D adding its own deterministic tests for clarification operation recognition and maintaining the bounded-store/race invariants.
