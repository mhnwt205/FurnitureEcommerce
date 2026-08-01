# Reference vs FurnitureEcommerce Architecture

## Capability comparison

| Capability | Reference project | FurnitureEcommerce | Assessment |
|---|---|---|---|
| NLU | None; raw prompt only. | Strict structured Gemini extraction plus deterministic fallback. | Keep current. |
| Response writing | Free text/raw JSON from model. | Backend-selected DTO allow-list with writer fallback. | Keep current. |
| Product authority | Model selects and returns full objects. | Backend controls IDs, prices, stock, ranking and DTO. | Current is materially safer. |
| Retrieval | `find({})` all posts or top 20; model performs relevance. | Primary/fallback retrieval seam, eligibility and Candidate Summary. | Keep current. |
| Ranking | No deterministic ranker. | Hard/soft classification and deterministic tie-breaker. | Keep current. |
| Clarification | None. | Deterministic policy, bounded questions and terminal no-result. | Keep current. |
| Session | Component-local message array. | Bounded backend store, copy-on-write, generation, queue and idempotency. | Keep current. |
| Tool/agent loop | None. | Deterministic staged orchestration; no unsafe tool loop. | Keep current. |
| Provider integration | Direct duplicated Gemini SDK calls. | Provider call constrained by prompt/allow-list/retry/fallback. | Current is stronger. |
| Frontend AI UX | Basic chat state/loading and search-result rendering. | Existing advisor response compatibility; Phase H planned for multi-turn/option UX. | Adapt only presentation ideas in H. |
| Tests | No test suite found. | Focused unit/route/session/concurrency/call-count suite. | Keep current. |
| Observability | Console logs. | Structured provider logging and tests. | Keep current. |

## Invariants that cannot be traded away

Any adoption must preserve backend product-ID authority, backend effective price/stock, strict taxonomy and schemas, deterministic clarification, Stage 1/Stage 2 split, short-circuiting, copy-on-write sessions, generation checks, idempotency, bounded memory, hard/soft classification, exclusion and stock filters, stable tie-breaker and regression coverage.

The reference violates several of these: model-selected objects, unvalidated output, raw catalog injection, no session transaction and no rate/resilience boundary. These are reasons to reject its core architecture, not reasons to simplify FurnitureEcommerce.

## Code-organization comparison

The reference has tiny AI utility files, but their brevity comes from delegating retrieval, ranking and response authority to the LLM. It does not demonstrate a handler registry, strategy, workflow graph, rule pipeline, state machine or scorer registry that FurnitureEcommerce can reuse. Replacing deterministic rules with prompt-driven branching would merely move `if/else` into an opaque and untestable provider call.

FurnitureEcommerce should retain the code-quality audit proposal: handler maps for bounded phrase recognition/operations, a deterministic eligibility rule pipeline, scorer registry for E4, and one no-result presentation lookup. Those are safer than any pattern evidenced by the reference project.
