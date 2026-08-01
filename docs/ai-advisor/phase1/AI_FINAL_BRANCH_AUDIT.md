# Final Branch Audit — AI Advisor

## Executive conclusion

**Go for scoped staging, commit, push, and manual deployment.** This audit found no Critical or High blocker in the AI implementation, import migration, or focused regression. The branch keeps backend recommendation authority and all hard-gate evaluation checks pass. Two Medium follow-ups should be planned: calibrate the informational Vietnamese evaluation metrics and replace the two legacy `console.error` error paths with the structured logger before a higher-volume rollout.

This was a read-only source/test audit except for creation of this report. No production code, environment file, database, migration, staging, commit, push, or deployment was performed.

## Git/worktree scope

- Current branch is `codex/ai-phase-a-characterization`; no files are staged. The latest existing commit is unrelated historical work (`de3378d`).
- The tracked deletion of `backend/services/aiAdvisor.service.js` is the intended removal of the former flat implementation. The replacement implementation is under `backend/services/ai-advisor/`.
- Shared tracked changes are AI-only and additive: controller delegation (`backend/controllers/aiAdvisor.controller.js:2-18`), protected metrics payload extension (`backend/app.js:39,61-65`), telemetry allow-list fields (`backend/utils/logger.js:1-5`), and evaluation commands (`backend/package.json:10-14`).
- Generated evaluation reports are ignored, while dataset/baseline/source remain versioned (`backend/.gitignore:1-2`).

### Commit scope plan (do not run during this audit)

Stage only these reviewed paths, after individually reviewing their status:

```powershell
git add -u -- backend/services/aiAdvisor.service.js
git add -- backend/services/ai-advisor backend/evaluation backend/.gitignore
git add -- backend/controllers/aiAdvisor.controller.js backend/app.js backend/utils/logger.js backend/package.json
git add -- backend/tests/h3.ai-*.test.js backend/tests/h3.metrics.test.js backend/tests/h3.ai-resilience.test.js
git add -- frontend/src/components/ai/AISalesAdvisor.jsx frontend/src/services/api/aiAdvisorService.js frontend/src/features/aiAdvisor
git add -- docs/ai-advisor
```

Never stage `.agents/`, `.cache/`, `frontend/src/pages/AdminVoucherAssignments.jsx`, `skills-lock.json`, runtime evaluation reports, or any unrelated user path.

## Source/module integrity

The module root exports the controller-facing conversation entry, Stage 1/2 seams, telemetry, and metrics (`backend/services/ai-advisor/index.js:1-11`). Implementations are grouped by conversation, intent, clarification, candidates, recommendation, comparative, relaxation, and telemetry. Targeted repository searches found no runtime import using the old flat `services/ai*.js` implementation paths; old-name hits are historical Phase A–E reports and should be treated as historical references, not runtime broken links.

Dependency direction is sound in the inspected paths: controller imports only the feature entry (`backend/controllers/aiAdvisor.controller.js:2`); conversation orchestrates intent/candidate/recommendation work (`backend/services/ai-advisor/conversation/conversation.service.js:93`); Stage 2 consumes prepared candidates (`backend/services/ai-advisor/recommendation/advisor.service.js:827-869`); telemetry receives events but does not decide outcomes (`backend/services/ai-advisor/telemetry/telemetry.service.js:8-21`). No circular import surfaced in module-load and focused test execution. `conversation.service.js` remains a large orchestrator, but injected operations and feature services keep it a deferred cleanup risk rather than a correctness blocker.

## API compatibility

The controller strictly accepts legacy `message`/`context` plus optional session fields (`backend/controllers/aiAdvisor.controller.js:4-12`) and returns the complete conversation result unchanged with the existing successful 200 status (`:14-18`). The frontend request builder sends optional additions only (`frontend/src/services/api/aiAdvisorService.js:3-16`) and normalizes missing `type` as a recommendation-compatible legacy response (`frontend/src/features/aiAdvisor/aiAdvisorNormalizer.js:4-13`). All normalized responses retain an answer string and recommendations array; no internal summary, intent, telemetry payload, or stored session object is returned.

## Session correctness

The session store clones before work and compare-and-commits the same id/generation (`backend/services/ai-advisor/conversation/session.store.js:18-20`). Conversation checks idempotency before processing, works from that clone, caches only a completed response, and rejects stale commits (`backend/services/ai-advisor/conversation/conversation.service.js:134-156,230-232`). Turn, recent-turn, and cache limits are bounded (`conversation.types.js:3-6,17-20`; `conversation.service.js:227-231`). Terminal no-result is capped rather than repeatedly asking a question (`conversation.service.js:199-205`), and recommendation context is updated only with real recommendations (`:226`). This supports rollback on unhandled Stage 1/Stage 2 failure, serialization, reset/rotation, and duplicate behavior covered by transaction tests.

## Recommendation authority and correctness

Stage 1 is an explicit production seam (`backend/services/ai-advisor/recommendation/advisor.service.js:779-812`) and Stage 2 consumes its prepared output once (`:827-869`). Eligibility applies canonical exclusions and `stockRequired` before Stage 2 (`backend/services/ai-advisor/candidates/eligibility.service.js:43-105`); comparative filtering uses only normalized size taxonomy and product IDs/prices (`backend/services/ai-advisor/comparative/eligibility.service.js:1-16`). Ranking uses the E2 comparator before diversification (`advisor.service.js:751-759,819`), while diversification is invoked only over already-selected eligible candidates (`:835-836`). Thus Stage 2 cannot restore a hard-filtered candidate.

Writer telemetry and fallback are provider-bounded (`advisor.service.js:651-703,851-869`). Backend keeps recommendation IDs/order/DTO and accepts only grounded writer material through the reason validation seam. Effective price is the comparison authority for comparative price rules (`backend/services/ai-advisor/comparative/policy.service.js:16-18`), so ordinal references never use a context min/max as a fabricated product price.

## Clarification, comparative, and relaxation

Clarification policy uses a bounded consecutive count (`backend/services/ai-advisor/clarification/clarification.policy.js:5-13`); the conversation service turns capped zero-candidate cases into terminal no-result (`conversation.service.js:199-205`). Comparative missing price/size becomes `clarify_missing_reference`, not an inferred hard filter (`backend/services/ai-advisor/comparative/policy.service.js:16-18`); reference size is canonicalized against `AI_SIZES` (`backend/services/ai-advisor/comparative/reference.service.js:2-17`).

Relaxation proposals are strict, bounded to three options (`backend/services/ai-advisor/relaxation/relaxation.schema.js:4-5`), deterministic from stored state (`policy.service.js:9`), and applied only through a selected existing option to a clone (`application.service.js:3`). Consent requires a specific option when multiple choices exist (`consent.service.js:3`). These boundaries prevent automatic constraint relaxation and proposal replay from mutating unrelated fields.

## Frontend integration

The UI persists a bounded safe conversation representation only after obtaining a session (`frontend/src/components/ai/AISalesAdvisor.jsx:27-27`; `frontend/src/features/aiAdvisor/aiAdvisorStorage.js:17-27`). Each submission uses an `AbortController`, session ID, and client message ID (`AISalesAdvisor.jsx:30-46`); reducer generation/client-message checks reject stale responses (`frontend/src/features/aiAdvisor/aiAdvisorState.js:18-27`). Reset preserves prior UI until server success (`AISalesAdvisor.jsx:38,42`), retries reuse their message ID (`:46`), and the normalizer handles clarification, relaxation, terminal no-result, and legacy responses (`aiAdvisorNormalizer.js:4-13`). The frontend displays backend order and does not calculate price or stock.

## Telemetry, privacy, and cardinality

Telemetry parses a closed schema before sinking events and isolates sink/metrics errors (`backend/services/ai-advisor/telemetry/telemetry.service.js:8-21`; `telemetry.schema.js:28`). Metrics labels are restricted to outcome/provider/model/reason/field/intent/owner, not session/user/product IDs (`telemetry/metrics.service.js:12-19`). The logger has an explicit field allow-list (`backend/utils/logger.js:1-5`), and the protected existing `/metrics` endpoint retains bearer-token behavior while adding a nested `ai` snapshot (`backend/app.js:61-65`). Evaluation uses isolated sinks/registries in tests; generated reports are ignored.

## Evaluation and quality gates

The versioned Vietnamese dataset contains 100 unique cases, and the runtime report is ignored (`backend/evaluation/datasets/vi-v1.json`; `backend/.gitignore:1-2`). The latest offline evaluation result is **52 passed, 48 failed, 10 unsupported of 100**. Its hard gates all pass: hard-constraint validity, valid IDs, no duplicate IDs, deterministic replay, and privacy leakage are each `1.0`. Grounded reason validation is `978/978`; comparative-type accuracy is `11/12`.

Informational metrics require calibration before claiming NLU quality targets: category accuracy is `0.58`, budget parsing `0.80`, action accuracy `0.867`, and clarification-field accuracy `0/12`. They do not fail the current hard-gate CLI, but the low figures are a real evaluation-data/expectation gap and must not be presented as model-quality success.

## Configuration and dependency audit

Inspected environment names only: `GEMINI_API_KEY` and optional `AI_MODEL` are read server-side (`backend/services/ai-advisor/recommendation/advisor.service.js:19,657`; `intent/intent-extraction.service.js:7,42`); `AI_ADVISOR_RATE_LIMIT_MAX` and `AI_ADVISOR_RATE_LIMIT_WINDOW_MS` retain bounded defaults (`backend/middlewares/publicRateLimit.middleware.js:22`); `METRICS_TOKEN` protects metrics (`backend/app.js:62`). No value was read or printed. Missing Gemini key follows the existing deterministic fallback paths. Package diff adds only evaluation scripts (`backend/package.json:10-14`); no package or lockfile change was found.

## Non-AI regression risk

Only `app.js` and `utils/logger.js` are shared runtime files. Their diffs are additive and AI-scoped: nested AI metrics (`backend/app.js:39,61-65`) and allow-listed AI metadata (`backend/utils/logger.js:1-5`). Route mounting remains at `/api/ai-advisor` (`backend/app.js:81`), with no inspected changes to Auth, Product, Cart, Order, VNPay, Refund, Dashboard, or Voucher code. The unrelated untracked AdminVoucher page remains excluded from the proposed commit.

## Findings by severity

| Severity | Finding | Disposition |
|---|---|---|
| Critical | None found. | — |
| High | None found. | — |
| Medium | Informational evaluation metrics are below the originally suggested soft targets, notably clarification-field accuracy 0/12. | Calibrate fixture expectations/coverage in a follow-up; do not treat current 52/100 as a release-quality pass rate. |
| Medium | Two legacy `console.error` paths remain: writer fallback (`backend/services/ai-advisor/recommendation/advisor.service.js:865`) and controller error handling (`backend/controllers/aiAdvisor.controller.js:23`). Error messages/objects should be routed through the sanitizer before high-volume deployment. | Harden separately; no raw prompt/catalog logging was found in the AI module search. |
| Low | Historical reports still cite pre-modularization file paths. | Preserve as historical evidence or repair links in a docs-only cleanup. |
| Informational | Session state and telemetry are in-process; multi-instance persistence/aggregation remains outside this branch. | Validate deployment topology and monitoring collection manually. |

## Manual deployment checklist

1. Set only server-side Gemini and metrics environment values; verify missing-key fallback first.
2. Confirm `GET /metrics` returns 404 without bearer token and includes only nested bounded AI metrics with the configured token.
3. Exercise one legacy `{ message, context }` request, a clarification, a relaxation proposal/reject/accept, and a comparative request; verify no product/order/price changes outside backend authority.
4. Verify browser reset, retry, option click, and stale-response behavior with a real session; ensure localStorage contains no catalog, prompt, or secrets.
5. Inspect production logs for sanitized fields only and monitor fallback/latency counters.

## Go/No-Go

**Go** for a carefully scoped stage/commit/push and manual deployment after the listed manual checks. There is no Critical/High code blocker. Do not claim the informational evaluation metrics as passing quality targets until their fixture/evaluator alignment is improved.
