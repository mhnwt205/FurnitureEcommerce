# Phase F — AI Telemetry, Metrics and Observability

## Scope

Phase F adds fail-open, in-process observability to the existing AI Advisor request lifecycle. It does not alter retrieval, eligibility, ranking, diversification, recommendation DTOs, session business state, provider retry policy, public API, database schema, or frontend.

## Telemetry event contract

`aiTelemetryEventSchema` strictly validates the event name, ISO timestamp, optional opaque request/session IDs, optional internal numeric user ID, owner type, duration, outcome, and a bounded metadata allow-list.

Lifecycle events include request start/completion/failure, intent extraction/fallback, session lifecycle, candidate preparation, clarification, terminal no-result, relaxation proposal/consent, recommendation return, provider attempts/fallback/failure, idempotency cache hits, and stale-commit prevention.

Unknown event fields and raw metadata are rejected. Telemetry failures are swallowed after a safe warning and never affect a business request.

## Metrics contract

`AiMetricsRegistry` is bounded in-process state. It exposes counters and summary aggregates through the existing bearer-protected `/metrics` endpoint under `ai`.

Counters include request, failure, clarification, no-result, relaxation, recommendation, provider, intent fallback, session creation/reset, and idempotency totals. Summaries include request, NLU, Stage 1, Stage 2, writer, candidate-count, and recommendation-count observations.

Supported labels are a fixed whitelist: outcome, provider, model, reasonCode, clarificationField, intentType, and ownerType. Unknown values become `unknown`; request, session, user, product, message, and proposal identifiers are never metric labels.

## Lifecycle instrumentation

- Conversation emits request, session, idempotency, Stage 1, branch, stale-commit, and completion/failure events.
- Candidate pipeline events carry bounded counts and retrieval fallback metadata only.
- Recommendation return carries only recommendation count and Stage 2 duration.
- Clarification, terminal no-result, and relaxation proposal paths still short-circuit Stage 2.

## Provider telemetry

NLU and writer attempts record bounded provider/model/operation, attempt, duration, timeout, sanitized HTTP status, and classified error code. No API key, malformed output, and final writer fallback are recorded without prompt, response body, key, or raw error text.

## Session telemetry

Conversation emits created/reused/reset/idempotency/stale-commit events. The session store has an optional telemetry hook for expiration and capacity eviction. Only opaque session ID, owner type, internal user ID, and a bounded session action are emitted.

## Privacy and cardinality

The schema omits raw messages, prompts, catalog/product DTOs, product names/descriptions, session state, provider bodies, recommendation facts, PII, tokens, and secrets. The privacy suite serializes fixture values containing email, phone, address, API-key-like text, and product description and confirms they do not appear.

## Metrics endpoint

The existing `/metrics` bearer-token protection and HTTP aggregate response remain unchanged. The response has an additive `ai` snapshot with counters and summaries; it contains no session/user/product labels.

## Future dashboard specification

Phase H/admin dashboard may consume only aggregates to display request volume, success rate, clarification/no-result rate, relaxation acceptance, provider fallback rate, p50/p95 derived externally from duration summaries, recommendation count, and session reuse rate. No dashboard UI is added in Phase F.

## Tests

Direct tests cover strict event validation, lifecycle ordering, clarification/relaxation Stage 2 omission, idempotency non-double-counting, Stage 1 failure, no-key provider fallback, store eviction, bounded metrics labels, endpoint protection, privacy serialization, and telemetry sink failure isolation.

## Limitations

Metrics are process-local bounded aggregates. They are not durable or multi-instance aggregated, and summary statistics expose count/sum/min/max rather than native percentile histograms. Phase G evaluation and a future production metrics backend can consume the stable event/metric vocabulary without changing recommendation authority.

## Readiness Phase G

Ready after the focused AI/rate suite, Prisma validation, frontend tests/build, and diff integrity gates pass.
