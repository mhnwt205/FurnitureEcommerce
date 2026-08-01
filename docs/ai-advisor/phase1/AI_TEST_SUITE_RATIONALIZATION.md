# AI Advisor Test Suite Rationalization

## Scope and method

This audit reviewed the AI test tree after final modularization. A test was retained when it protects a production boundary, deterministic invariant, security property, or regression that no stronger test replaces. Tests were not removed merely because they are small, phase-named, or use fixtures. Production code was not changed.

The only removals are two export-presence checks. Direct dependency-injected production tests now execute the same Stage 1/Stage 2 seams and assert concrete call order/output, so those import-only checks add no independent regression protection.

## Inventory

Counts below use `node:test` `test(...)` blocks. Backend AI files changed from **35 files / 125 tests** to **33 files / 123 tests**. The separate metrics endpoint test, evaluation test, and two frontend AI test files are retained.

| Test file | Cases | Production boundary/invariant | Real production path | Decision |
|---|---:|---|---|---|
| `h3.ai-advisor-controller-contract.test.js` | 1 | HTTP additive response contract | Controller factory | KEEP |
| `h3.ai-advisor-stage-call-count.test.js` | 3 | Direct Stage 1/2 DI calls and explicit-sort handoff | Yes | KEEP |
| `h3.ai-candidate-policy-integration.test.js` | 1 | Summary-to-policy no-result boundary | Yes | KEEP |
| `h3.ai-candidate-retrieval.test.js` | 3 | Primary/fallback retrieval and immutability | Yes | KEEP |
| `h3.ai-candidate-summary.test.js` | 6 | Summary schema, diagnostics, reasons | Yes | KEEP |
| `h3.ai-characterization.test.js` | 13 | Legacy parser/pricing/DTO/prompt baseline | Yes | KEEP |
| `h3.ai-clarification-orchestration.test.js` | 2 | State transition/cap service | Yes | KEEP |
| `h3.ai-clarification-policy.test.js` | 4 | Deterministic policy edge decisions | Yes | KEEP |
| `h3.ai-clarification-response.test.js` | 8 | Short-circuit and public response behavior | Conversation path | KEEP |
| `h3.ai-clarification-terminal.test.js` | 2 | Terminal no-result/no loop | Conversation path | KEEP |
| `h3.ai-comparative-extraction.test.js` | 2 | Phrase recognition | Yes | KEEP |
| `h3.ai-comparative-filtering.test.js` | 3 | Price/product/normalized-size filtering | Yes | KEEP |
| `h3.ai-comparative-policy.test.js` | 2 | Strict policy/missing-reference behavior | Yes | KEEP |
| `h3.ai-comparative-ranking.test.js` | 1 | Comparative soft scorer | Yes | KEEP |
| `h3.ai-comparative-reference.test.js` | 6 | Ordinal/current/context resolution | Yes | KEEP |
| `h3.ai-constraint-classification.test.js` | 4 | Required/preferred classification | Yes | KEEP |
| `h3.ai-conversation-operation.test.js` | 3 | Operation recognition and merge semantics | Yes | KEEP |
| `h3.ai-conversation-transaction.test.js` | 6 | Rollback, stale commit, duplicate/concurrency | Conversation/store | KEEP |
| `h3.ai-conversation.test.js` | 7 | Session merge/reset/queue contract | Conversation/store | KEEP |
| `h3.ai-evaluation.test.js` | 4 | Dataset/evaluator/gate/CLI behavior | Evaluator source | KEEP |
| `h3.ai-exclusion-stock.test.js` | 6 | E1 hard eligibility and diagnostics | Stage 1/eligibility | KEEP |
| `h3.ai-grounded-reason.test.js` | 1 | Fact-backed deterministic reason priority | Yes | KEEP |
| `h3.ai-hard-soft-ranking.test.js` | 5 | Hard/soft filters, comparator, explicit sort | Stage 1/2 helpers | KEEP |
| `h3.ai-intent.test.js` | 9 | Strict schema, provider boundary, fallback, prompt | Yes with mocked provider | KEEP |
| `h3.ai-recommendation-diversification.test.js` | 4 | Bounded deterministic top-N selection | Yes | KEEP |
| `h3.ai-relaxation-application.test.js` | 1 | Exact-field immutable application | Yes | KEEP |
| `h3.ai-relaxation-consent.test.js` | 1 | Ambiguous/multi-option consent safety | Yes | KEEP |
| `h3.ai-relaxation-policy.test.js` | 1 | Proposal determinism/bounds | Yes | KEEP |
| `h3.ai-resilience.test.js` | 3 | Writer retry/timeout/no-key behavior | Yes with mocked provider | KEEP |
| `h3.ai-telemetry-events.test.js` | 6 | Lifecycle branches/fail-open events | Conversation/provider seams | KEEP |
| `h3.ai-telemetry-metrics.test.js` | 3 | Bounded metric labels and failure isolation | Yes | KEEP |
| `h3.ai-telemetry-privacy.test.js` | 1 | Serialized PII/unsafe metadata rejection | Yes | KEEP |
| `h3.ai-writer-grounding.test.js` | 1 | Writer allow-list/order/code validation | Yes | KEEP |
| `h3.metrics.test.js` | 1 | Bearer-protected metrics endpoint | App route | KEEP |
| `frontend/src/features/aiAdvisor/aiAdvisorState.test.js` | 4 | Normalizer, retry/stale/reset reducer contract | Yes | KEEP |
| `frontend/src/features/aiAdvisor/aiAdvisorStorage.test.js` | 1 | Bounded persistence/expiry behavior | Yes | KEEP |
| `h3.ai-advisor-pipeline.test.js` | 1 | Only asserted export existence plus `assert.ok(true)` | No behavioral path | REMOVE |
| `h3.ai-advisor-stage-split.test.js` | 1 | Only asserted two exports exist | No behavioral path | REMOVE |

## Coverage matrix

| Invariant | Tests retained | Removed/replaced test | Coverage after rationalization |
|---|---|---|---|
| API and controller contract | controller contract; characterization validation | — | Strong route-level contract |
| Intent/schema/provider fallback | intent; characterization; resilience | — | Strict schema plus mocked provider boundary |
| Session/reset/idempotency/concurrency | conversation; transaction; clarification response/terminal | — | Copy-on-write and stale/duplicate paths |
| Clarification/no-result | clarification policy/orchestration/response/terminal; candidate-policy integration | — | Decision, cap, public branch |
| Eligibility | candidate retrieval/summary; exclusion-stock; hard-soft ranking | — | All hard constraint diagnostics |
| Ranking and explicit sorts | hard-soft ranking; stage-call-count; diversification | — | Comparator and Stage 2 handoff |
| Comparative | extraction/filtering/policy/ranking/reference | — | Reference, hard filters, soft scores |
| Relaxation | policy/consent/application; transaction | — | Proposal, consent, mutation rollback |
| Diversification | recommendation diversification; stage-call-count | — | Deterministic bounded selection |
| Grounding/writer fallback | grounded reason; writer grounding; resilience | — | Facts, allow-list, retries/fallback |
| Telemetry/metrics/privacy | telemetry events/metrics/privacy; metrics endpoint | — | Fail-open, bounded labels, bearer endpoint |
| Offline evaluation | ai-evaluation; `backend/evaluation/**` | — | Schema, gates, report/CLI behavior |
| Frontend state/storage | frontend AI state/storage tests | — | Session, retry/reset, persistence |
| Stage seam existence | stage-call-count executes both production seams | pipeline; stage-split | Stronger behavioral proof replaces import checks |

## Evaluation assets

Commit evaluation source and versioned inputs: `backend/evaluation/*.js`, `backend/evaluation/datasets/vi-v1.json`, `backend/evaluation/fixtures/products.vi.json`, `backend/evaluation/baselines/vi-v1.json`, plus `backend/tests/h3.ai-evaluation.test.js`.

Do **not** commit generated runtime reports under `backend/evaluation/reports/`; they are intentionally ignored by `backend/.gitignore`.

## Exact staging recommendation — test files only

```text
backend/tests/h3.ai-advisor-controller-contract.test.js
backend/tests/h3.ai-advisor-stage-call-count.test.js
backend/tests/h3.ai-candidate-policy-integration.test.js
backend/tests/h3.ai-candidate-retrieval.test.js
backend/tests/h3.ai-candidate-summary.test.js
backend/tests/h3.ai-characterization.test.js
backend/tests/h3.ai-clarification-orchestration.test.js
backend/tests/h3.ai-clarification-policy.test.js
backend/tests/h3.ai-clarification-response.test.js
backend/tests/h3.ai-clarification-terminal.test.js
backend/tests/h3.ai-comparative-extraction.test.js
backend/tests/h3.ai-comparative-filtering.test.js
backend/tests/h3.ai-comparative-policy.test.js
backend/tests/h3.ai-comparative-ranking.test.js
backend/tests/h3.ai-comparative-reference.test.js
backend/tests/h3.ai-constraint-classification.test.js
backend/tests/h3.ai-conversation-operation.test.js
backend/tests/h3.ai-conversation-transaction.test.js
backend/tests/h3.ai-conversation.test.js
backend/tests/h3.ai-evaluation.test.js
backend/tests/h3.ai-exclusion-stock.test.js
backend/tests/h3.ai-grounded-reason.test.js
backend/tests/h3.ai-hard-soft-ranking.test.js
backend/tests/h3.ai-intent.test.js
backend/tests/h3.ai-recommendation-diversification.test.js
backend/tests/h3.ai-relaxation-application.test.js
backend/tests/h3.ai-relaxation-consent.test.js
backend/tests/h3.ai-relaxation-policy.test.js
backend/tests/h3.ai-resilience.test.js
backend/tests/h3.ai-telemetry-events.test.js
backend/tests/h3.ai-telemetry-metrics.test.js
backend/tests/h3.ai-telemetry-privacy.test.js
backend/tests/h3.ai-writer-grounding.test.js
backend/tests/h3.metrics.test.js
frontend/src/features/aiAdvisor/aiAdvisorState.test.js
frontend/src/features/aiAdvisor/aiAdvisorStorage.test.js
```

The removed files must not be staged. Also never stage `.agents/`, `.cache/`, `frontend/src/pages/AdminVoucherAssignments.jsx`, `skills-lock.json`, or ignored generated evaluation reports.

## Regression after rationalization

Run after the two removals:

```powershell
cd backend
npm.cmd run test:ai-eval
$tests = @(Get-ChildItem tests -Filter 'h3.ai-*.test.js' | Sort-Object Name | ForEach-Object { $_.FullName }) + @((Resolve-Path tests\h3.metrics.test.js).Path, (Resolve-Path tests\h1.rate-limit.test.js).Path); node --test @tests
npx.cmd prisma validate

cd ../frontend
npm.cmd run test:run
npm.cmd run build

cd ..
git diff --check
git status --short
```

No production behavior changed as part of this rationalization.
