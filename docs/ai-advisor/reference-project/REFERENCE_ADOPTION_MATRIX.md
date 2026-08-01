# Reference Adoption Matrix

| Thành phần | Project mẫu | FurnitureEcommerce | Quyết định | Lý do |
|---|---|---|---|---|
| NLU | One raw prompt | Structured extraction + deterministic fallback | KEEP_CURRENT | Reference has no schema boundary. |
| Session | React-only local array | Bounded transactional backend session | KEEP_CURRENT | Reference has no ownership, TTL, idempotency or concurrency handling. |
| Retrieval | Mongo all/top-20 then LLM selection | Backend retrieval + eligibility | KEEP_CURRENT | Model cannot be recommendation authority. |
| RAG/vector | Absent | Absent | DEFER | No reference evidence supports an adoption. |
| Tool calling | Absent | Absent | DEFER | Deterministic orchestration remains sufficient. |
| Clarification | Absent | Deterministic clarification state/policy | KEEP_CURRENT | Reference offers no applicable pattern. |
| Ranking | Model implicit ranking | Hard/soft rules + deterministic tie-break | KEEP_CURRENT | Reference is non-deterministic and ungrounded. |
| Prompt organization | Inline literals | Constrained writer + structured NLU | ADAPT | A separate prompt module can improve ownership only; retain current contracts. |
| Provider adapter | Two direct Gemini instantiations | Existing provider boundary | ADAPT | Central configuration can reduce duplication; do not copy direct calls. |
| Frontend UX | Text chat/loading/auto-scroll; result cards | Phase H pending | ADAPT | Reuse only UX ideas, with sessionId/options/response validation. |
| Testing | Placeholder server test | Focused AI regression suite | KEEP_CURRENT | Current coverage is stronger. |
| Telemetry | Console logging | Structured logging | KEEP_CURRENT | Do not adopt raw message/error logs. |
| Error fallback | `[]` / undefined | Explicit policy/writer/session fallbacks | REJECT | Reference masks failures and loses diagnostics. |
| Full catalog in prompt | Full posts or title/price list | Bounded selected DTOs | REJECT | Catalog/PII leakage and hallucinated DTO risk. |

## Three adoption levels

### Level 1 — low risk

- **ADAPT:** a frontend loading/error/auto-scroll pattern in Phase H, preserving server session ownership and additive response fields.
- **ADAPT:** isolate prompt text into named builder modules if future provider prompts grow; keep strict schemas and backend allow-list.

### Level 2 — adapter/migration required

- **DEFER:** central provider adapter/configuration; introduce only behind the existing DI seams with mock tests.
- **DEFER:** streaming UX, only after a response event contract and cancellation/session semantics are designed.
- **DEFER:** RAG/vector search and tools; no source evidence justifies them, and they require data-consistency/security work.

### Level 3 — reject

- **REJECT:** model selecting product/post IDs or returning source DTOs.
- **REJECT:** unbounded/raw catalog injection, raw free-text business response, unvalidated JSON and silent empty-result fallback.
- **REJECT:** frontend-only AI memory and direct console logging of user prompts.
