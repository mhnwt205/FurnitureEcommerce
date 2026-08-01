# Phase B.5 — Audit Structured Intent

## Scope và phương pháp

Audit read-only Phase B trên `codex/ai-phase-a-characterization`. Đối chiếu source, tests và Phase A/B reports; không sửa code/schema/API/dependency. Current-flow claims bên dưới có file:dòng.

## Current flow

```mermaid
flowchart LR
 R[POST /api/ai-advisor/chat] --> V[chatSchema validation]
 V --> S[getAdvisorResponse]
 S --> L[Legacy parser builds fallback intent]
 L --> N[Gemini NLU or fallback]
 N --> M[Canonical intent to legacy filters]
 M --> Q[Prisma retrieval]
 Q --> E[Promotion + review enrichment]
 E --> K[Existing deterministic ranking]
 K --> W[Gemini response writer]
 W --> D[answer + recommendations DTO]
```

- Public route applies only AI IP limiter then controller: `backend/routes/aiAdvisor.routes.js:4-7`; rate default 10/15 min: `backend/middlewares/publicRateLimit.middleware.js:9-22`.
- Controller validates message/context and still returns only `answer` and `recommendations`: `backend/controllers/aiAdvisor.controller.js:4-21`.
- Legacy budget/category/attribute parser runs once at the beginning of service and becomes `fallbackIntent`: `backend/services/aiAdvisor.service.js:722-730`.
- `extractStructuredIntent` either returns strict Gemini intent or that fallback; `source==='fallback'` intentionally reuses original legacy values, while valid Gemini intent maps to legacy budget/category/attributes: `backend/services/aiAdvisor.service.js:731-736`; extraction service: `backend/services/aiIntentExtraction.service.js:71-74`.
- Retrieval/enrichment/ranking remains existing path: where at `backend/services/aiAdvisor.service.js:301-319`, Prisma/promotions/reviews at `:746-780`, scoring/top 5 at `:781-817`.
- Writer Gemini is called after backend selection and can only change answer/reason; final response remains current DTO: `backend/services/aiAdvisor.service.js:827-839`.

No production path bypasses Zod for **Gemini NLU output**: `callGeminiIntent` calls `parseAiStructuredIntent` before returning (`backend/services/aiIntentExtraction.service.js:57-60`). The legacy fallback object is not separately parsed by Zod; it is produced from internal parser/mappings (`backend/services/aiAdvisor.service.js:252-299`). That is a trusted-source bypass, not a model bypass.

## Boundary findings

| Boundary | Finding | Evidence |
|---|---|---|
| NLU input | Only message, optional ID, taxonomy and output shape; no catalog/price/stock/promotion/PII/history | `backend/services/aiIntentExtraction.service.js:22-38` |
| NLU selection | Prompt forbids IDs/prices/stock/promotions/actions | `backend/services/aiIntentExtraction.service.js:25-29` |
| Writer input | Backend serializes selected recommendations to `allowedProducts` | `backend/services/aiAdvisor.service.js:585-616,627-647` |
| ID authority | Writer reason map filters IDs against recommendation allow-list | `backend/services/aiAdvisor.service.js:681-684` |
| DTO authority | Writer can replace answer/reason only; product fields are spread from backend recommendation | `backend/services/aiAdvisor.service.js:829-835` |
| Recommendation authority | Prisma, pricing, reviews and score execute before writer | `backend/services/aiAdvisor.service.js:746-817` |

Conclusion: backend remains authority. NLU does influence the legacy retrieval filters when valid; it does not choose products/facts. There is no path where writer output replaces price, stock or a product object.

## Intent field matrix

| Field | Schema / taxonomy | Legacy mapping | Current production use | Gap |
|---|---|---|---|---|
| `intentType` | closed enum, required | fallback derives it | Not consulted after extraction | ignored semantic |
| `category` | nullable closed category | direct legacy slug | Prisma category filter/score | good |
| `budget` | strict `{min,max,VND}`, integer/nonnegative/min≤max | Gemini maps to above/below/range | budget filter/score/answer | no `around` semantic from NLU |
| `room`, `style` | nullable closed enum | map to legacy terms | attribute score/exact filter | good |
| `colors`, `materials` | closed arrays, max 5 | map to legacy terms | attribute score/exact filter | duplicates accepted |
| `size` | nullable closed enum | one legacy size | soft size score | good |
| `stockRequired` | boolean required | fallback false | Not used | intentionally deferred |
| `sortPreference` | nullable closed enum | none | Not used | intentionally deferred |
| `constraints` | arbitrary bounded strings | none | Not used | cannot merge safely yet |
| `confidence` | number 0..1, reject not clamp | fallback 0 | Not used | no threshold/provenance |
| `missingImportantFields`, `ambiguousFields` | arbitrary bounded strings | empty fallback | Not used | clarification deferred |

Schema strictness is real: parent object and budget object use `.strict()`; budget refinement rejects `min > max` (`backend/services/aiIntent.schema.js:6-33`). Enums are imported from closed arrays (`backend/services/aiIntent.taxonomy.js:1-9`). Null/default behavior is explicit in the model output schema, but there are **no Zod defaults**: model must supply all keys. Arrays are not deduped by schema; fallback dedupes colors/materials only (`backend/services/aiAdvisor.service.js:257-258`).

## Fallback matrix

| Mode | Retry | Result / log | API consequence |
|---|---|---|---|
| No API key | none | returns null silently → legacy fallback | normal 200 if retrieval succeeds |
| Timeout / AbortError | one retry (2 total) | warn `gemini_intent_request_failed`, reason timeout | legacy fallback |
| HTTP 400 | no retry | warn upstream/validation | legacy fallback |
| HTTP 429/500 | one retry | warn only after terminal failure | legacy fallback |
| Malformed JSON / empty output | no retry | malformed logs; empty output returns null silently | legacy fallback |
| Fenced JSON | no retry | strip fence then validate | valid NLU path |
| Wrong type / extra key / invalid enum / confidence range | no retry | Zod failure warn → fallback | legacy fallback |
| Retry exhausted | two attempts | terminal warn; `retry_exhausted` branch is practically unreachable because catch returns null | legacy fallback |

Evidence: retry/timeout/fence/parse are `backend/services/aiIntentExtraction.service.js:7-69`; fallback source is `:71-74`. Writer uses a separate timeout/retry implementation (`backend/services/aiAdvisor.service.js:649-701`) and is caught at `:827-837`, preserving rule-based response. Thus a request with valid recommendations can intentionally make NLU call plus writer call; on NLU retry and writer retry this can be up to four provider attempts. This is not an accidental double-call, but cost/latency should be measured before Phase C.

## Security and logging

Input max 1000 comes from controller (`backend/controllers/aiAdvisor.controller.js:4-8`). NLU prompt requires JSON, taxonomy-only values and treats message as data (`backend/services/aiIntentExtraction.service.js:22-38`). Prompt injection cannot force an extra key through strict parsing; test covers this (`backend/tests/h3.ai-intent.test.js:65-80`). Current product context exposes only numeric ID, not product record (`backend/services/aiIntentExtraction.service.js:32`).

Logger allowlist excludes raw message/model response/key/PII (`backend/utils/logger.js:1-27`). NLU terminal failures log only reason and error metadata (`backend/services/aiIntentExtraction.service.js:64-68`). Gaps: no explicit `fallback_used` event for no-key/empty-output; error stacks in non-production may include parser diagnostic details, though no raw prompt is passed to error construction.

## Compatibility findings

Endpoint/method/public status/rate limit unchanged (`backend/routes/aiAdvisor.routes.js:4-7`; `backend/middlewares/publicRateLimit.middleware.js:22`). Request remains `{message, context.currentProductId?}`; no session ID/type/clarification is required (`backend/controllers/aiAdvisor.controller.js:4-14`). Frontend sends exactly this and reads `answer/recommendations` (`frontend/src/services/api/aiAdvisorService.js:3-9`, `frontend/src/components/ai/AISalesAdvisor.jsx:83-101`).

With unavailable/invalid NLU, Phase A category/budget/retrieval/ranking/recommendation count/writer fallback stay on the original values by `source==='fallback'` selection (`backend/services/aiAdvisor.service.js:731-736`). With a valid NLU, category/budget/attributes intentionally may differ from regex parsing; this is Phase B's intended internal behavior, not an API contract change.

## Test quality audit

`h3.ai-characterization.test.js` is unit characterization for parser/where/pricing/score/writer allow-list; `h3.ai-intent.test.js` is unit mock-provider/schema coverage; `h3.ai-resilience.test.js` mock-tests writer resilience; `h1.rate-limit.test.js` is localhost middleware integration. All mock fetch; no external network/database. Deterministic retry waits are 200 ms, not clock-sensitive assertion.

Strengths: strict schema/fenced/malformed/timeout/taxonomy-injection/no-key are covered. Gaps: no service-level test injecting a **valid NLU intent and asserting the actual Prisma where/ranking result**; no service-level invalid-NLU fallback comparison for recommendation DTO; route test validates schema seam rather than an actual valid POST response because service uses Prisma. These are meaningful coverage gaps, not evidence of a production defect.

## Duplication and debt

| Debt | Evidence | Severity / Phase C action |
|---|---|---|
| Category/taxonomy duplicated | legacy aliases `aiAdvisor.service.js:11-18`; canonical categories `aiIntent.taxonomy.js:1-9`; prompt serializes taxonomy `aiIntentExtraction.service.js:32-34` | Medium; defer refactor, but add mapping tests before changing taxonomy |
| Timeout/retry/fence parsing duplicated | NLU `aiIntentExtraction.service.js:7-69`; writer `aiAdvisor.service.js:618-701` | Medium; defer, no session blocker |
| Legacy/canonical adapters embedded in orchestrator | `aiAdvisor.service.js:252-299` | Medium; Phase C should avoid expanding this file |
| Arbitrary merge arrays/string lists | schema `aiIntent.schema.js:25-31` | High for session merge; define rules before C |
| `intentType`/confidence/missing/ambiguous not consumed | schema `:18-31`, service consumption `aiAdvisor.service.js:731-736` | Expected Phase C input, but requires policy |

## Phase C readiness

**Go with required design decisions before implementation, not with a code blocker.** The current shape is usable as an input snapshot, but Phase C must specify: explicit overwrite vs retain for nullable scalars; dedupe/replace semantics for colors/materials; budget range intersection vs replacement; conflict representation; negation/excluded fields (currently absent); comparative baseline for “rẻ hơn/màu khác/nhỏ hơn”; per-field source/confidence; and validation of `currentProductId` reference/ownership. `constraints` as arbitrary strings should not be merged blindly.

No technical change is mandatory before opening a Phase C design task. Before Phase C implementation, add the two service-level compatibility tests above and decide canonical array/budget/negation merge rules. Optional later improvements: common provider adapter, explicit fallback telemetry, and taxonomy single-source refactor.
