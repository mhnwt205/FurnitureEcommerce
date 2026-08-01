# AI Advisor risk matrix

| Risk | Likelihood | Impact | Current control | Proposed mitigation | Owner/phase |
|---|---:|---:|---|---|---|
| Fabricated product/price/stock | Medium | High | allowedProducts prompt, ID reason filtering | strict DTO rehydrate + Zod + no model-selected IDs | E/F |
| Out-of-stock recommendation | Medium | High | stock score only | hard stock filter when required | E |
| Wrong Vietnamese budget | High | Medium | regex `tr/trieu/k/nghin` | structured NLU + corpus incl. củ/triệu rưỡi | A/B |
| Lost follow-up context | High | Medium | only `currentProductId` per request | session snapshot/merge/version | C |
| Excessive clarification | Medium | Medium | none | one question, max two sequential turns | D |
| Prompt injection | Medium | High | prompt instruction | untrusted output/schema/data minimization | B/F |
| Provider timeout/cost | Medium | Medium | 8s timeout/retry/fallback | circuit/budgets/telemetry | F/G |
| Session hijack/PII retention | Medium | High | no session currently | opaque bound ID, TTL, redacted logs | C/G |
| Catalog query/performance | Medium | Medium | max 50, DB initial sort | indexed hard filters, bounded enrich/cache after measure | E |
| Metrics leak raw chat | Medium | High | logger allowlist | event schema/redaction/retention review | G |

Current controls are verified in `AI_CURRENT_ARCHITECTURE_AUDIT.md`; mitigation entries are proposals only.
