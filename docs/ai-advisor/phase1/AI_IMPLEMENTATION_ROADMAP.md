# Implementation roadmap (đề xuất, không triển khai trong phase này)

| Phase | Scope/files dự kiến | Test | Risk | Done criteria |
|---|---|---|---|---|
| A — Characterization and regression protection | `aiAdvisor.service` tests, catalog fixtures, contract snapshots | parser/ranking/current fallback | khóa nhầm behavior lỗi thời | existing behavior documented and tested |
| B — Structured intent extraction | intent schema, NLU provider adapter, deterministic fallback | Vietnamese intent corpus, invalid JSON | taxonomy drift | strict validated intent/fallback |
| C — Conversation/session contract | controller DTO, session adapter, frontend service | guest/auth/session reset/idempotency | ownership leak | multi-turn merge works without auth token reuse |
| D — Clarification manager | orchestrator/policy templates/widget question UI | priority/max questions/no-result | over-questioning | at most one question/turn, bounded loop |
| E — Deterministic recommendation authority | query/filter/ranker/reason codes | stock/promotion/price/ID validity | catalog performance | 100% recommendations backend-valid |
| F — Provider resilience | timeout/retry/circuit/fallback/schema validation | mocked 408/429/5xx/malformed | provider outage | safe deterministic fallback |
| G — Telemetry and evaluation | redacted metrics/eval runner/dashboard | privacy + metric snapshots | raw content leakage | measurable validity/latency/fallback |
| H — Frontend conversation UX | widget session/refine/reset/accessibility | component/e2e | UX state loss | no reload/filter loss; errors recover |

Phase A precedes implementation because current tests only cover Gemini resilience (`backend/tests/h3.ai-resilience.test.js:1-39`). Phase B–E should land in small independent PRs; do not mix schema/storage decision with basic NLU. Schema/database is deliberately out of scope until Session Storage Decision is accepted.

## Expected touchpoints

Likely backend: `backend/routes/aiAdvisor.routes.js`, `backend/controllers/aiAdvisor.controller.js`, `backend/services/aiAdvisor.service.js`, new narrowly scoped adapters/services/tests. Likely frontend: `frontend/src/services/api/aiAdvisorService.js`, `frontend/src/components/ai/AISalesAdvisor.jsx`. Confirm actual files only when each phase starts; this is a forecast, not a claim that they already exist.
