# AI Phase E7 — Recommendation Quality Audit & Hardening Review

## Executive conclusion

This is a read-only review of E1–E6. No production source, API, dependency, frontend, database schema, or test expectation was changed. The E1–E5 hard-constraint/session design is substantially sound and focused regression passes. **Phase F is NO-GO until two correctness findings are addressed:** diversification re-sorts an already ranked list and therefore can break E2 explicit-sort/final-tie semantics; comparative size derives normalized size from product name/description despite the E4 trust boundary. Evidence and minimal remediation are below.

## Hard constraints

Stage 1 is the authority boundary. Retrieval is active/category/keyword only, then enriched candidates flow through budget, required attributes, exclusions, stock requirement, and comparative hard filtering in that order (`backend/services/aiAdvisor.service.js:794-801`; `backend/services/aiCandidateEligibility.service.js:53-103`; `backend/services/aiComparativeEligibility.service.js:5-16`). Exclusions reject canonical category/color/material/style values (`aiCandidateEligibility.service.js:72-83`); `stockRequired === true` permits only `Number(stock) > 0` (`:85-87`). Candidate Summary identifies the first hard stage that empties the set (`backend/services/aiCandidateSummary.service.js:12-20`).

Stage 2 consumes only `prepared.eligibility.candidates` (`backend/services/aiAdvisor.service.js:817-824`); it cannot resurrect excluded, inactive, over-budget, required-attribute, stock-required, or comparative-filtered candidates. Diversification only selects from that array (`backend/services/aiRecommendationDiversification.service.js:17-30`). Gemini receives selected allow-listed IDs and writer output is mapped back by backend order (`backend/services/aiAdvisor.service.js:839-848`; `backend/services/aiRecommendationReason.service.js:38-46`). Fallback retrieval remains upstream of this same eligibility path (`aiAdvisor.service.js:794-800`).

Accepted relaxation is applied only through the selected stored option and a cloned working session (`backend/services/aiRelaxationApplication.service.js:1-4`; `backend/services/aiConversation.service.js:117-135`), then Stage 1 runs again. Comparative filters run after E1/E2 filters (`aiAdvisor.service.js:798-800`), so they cannot bypass category, budget, exclusions, or stock.

## Soft scoring

| Factor | Score / policy | Evidence | Audit result |
| --- | --- | --- | --- |
| In-stock | +30 when default stock policy applies | `aiAdvisor.service.js:472-485` | Soft; E1 makes explicit availability hard earlier. |
| Category | +25 | `aiAdvisor.service.js:472-485` | Redundant but safe after category retrieval. |
| Budget | +20 | `aiAdvisor.service.js:472-485` | Hard-filtered first; score is explanatory/relevance reinforcement. |
| Current-product category | +8 | `aiAdvisor.service.js:472-485` | Soft. |
| Keyword | +7 per match | `aiAdvisor.service.js:472-485` | Can accumulate; bounded keyword extraction is required for predictability. |
| Attributes | Existing attribute scorer | `aiAdvisor.service.js:478`, E2 classifier `aiConstraintClassification.service.js:24-46` | Soft mismatch does not filter unless metadata says required. |
| Review | `min(reviewCount, 10)` base score; high-review reason needs rating ≥4.5 and count ≥5 | `aiAdvisor.service.js:484`; `aiRecommendationReason.service.js:30` | Review cannot exceed a large hard/relevance mismatch because hard candidates are gone; rating is only tie-breaker/reason. |
| Comparative | 4–8 each, registry sum | `aiComparativeScoring.service.js:2-16` | Several bonuses may sum; no direct cap. Medium calibration item. |
| Diversity | 2/dimension, max +6, only within ten-point gap | `aiRecommendationDiversification.service.js:3-14` | Bounded, but ordering defect below is required. |

No soft preference is fed to `applyCandidateEligibility` except a classifier-required field (`aiAdvisor.service.js:778-798`; `aiConstraintClassification.service.js:28-45`).

## Determinism

E2 comparator is deterministic and ends at product ID (`backend/services/aiAdvisor.service.js:738-758`). Relaxation proposals hash canonical reason/intent/exclusions/comparative type and options are handler-ordered (`aiRelaxationPolicy.service.js:3-10`). Reason code order is fixed in the builder (`aiRecommendationReason.service.js:19-32`); fallback prose is lookup-driven (`aiRecommendationReasonPresentation.js:1-4`). Tests prove comparator input-order stability, deterministic proposal IDs, and deterministic reason/diversification fixtures (`backend/tests/h3.ai-hard-soft-ranking.test.js`, `h3.ai-relaxation-policy.test.js`, `h3.ai-recommendation-diversification.test.js`, `h3.ai-grounded-reason.test.js`).

**Required finding R1 — diversification overrides the ranking contract.** `diversifyRecommendations` first calls its own `stableRank` (`aiRecommendationDiversification.service.js:7,17-21`). That comparator omits the E2 rating/review-count tie-breakers and always uses ascending price. Even with `price_desc`, `rating_desc`, or `newest`, the later `explicitSort` branch selects from this re-sorted order (`:19,22-27`). The existing explicit-sort test only covers ascending price, so it misses price-desc/rating/newest regressions. Minimal fix before F: preserve the supplied ranked order for explicit sorts; for relevance use the E2 comparator/tie data rather than a second partial comparator; add reverse-order fixtures for all four explicit sorts and equal-score rating/review ties.

## Comparative behavior

Recognition is bounded and ordered (`backend/services/aiComparativeExtraction.service.js:17-38`). Ordinals are only 1–5 and resolve only from bounded prior IDs (`aiComparativeReference.service.js:20-35`); price comparison uses a product-specific current-product/`productPrices` value, never context min/max as ordinal price (`aiComparativePolicy.service.js:16-18`). Missing price/color/material/style/size/reference is explicit in the resolver (`aiComparativeReference.service.js:36-54`) and produces a clarification policy instead of an inferred constraint (`aiComparativePolicy.service.js:16-18`). Cheaper/more-expensive use strict price inequalities; different-product excludes known IDs (`aiComparativeEligibility.service.js:9-15`). Different color/material/style and similarity are soft registry scorers (`aiComparativeScoring.service.js:6-16`).

**Required finding R2 — size comparison violates its normalized-data rule.** `productSize` derives a size by searching `p.size`, `p.dimensions`, **`p.name`**, and **`p.description`** (`aiComparativeEligibility.service.js:3-4`). E4's policy requires normalized reference/product size and prohibits deriving from free text. This can cause an unsupported product name/description to become a hard smaller/larger match or no-result. Minimal fix before F: use an explicit normalized `size` field only (or clarify when absent), and add fixtures proving name/description text is ignored.

## Relaxation safety

Proposal handlers are closed by no-result reason (`aiRelaxationPolicy.service.js:3-9`), options max at three and proposal ID is deterministic (`:8-10`). Consent requires an ordinal with multiple options; plain `ok` is ambiguous (`aiRelaxationConsent.service.js:1-4`). Application validates option membership, deep-clones, applies one handler, and clears only the pending proposal (`aiRelaxationApplication.service.js:1-4`). Conversation checks proposal expiry before consent, mutates only the working session, and commits through generation-safe store replacement (`aiConversation.service.js:117-135`; `aiConversationSession.store.js:16-20`).

**Medium finding M1 — rejection/ambiguous loop proof is incomplete.** Rejection returns terminal-looking `no_result`, while ambiguous responses return the pending proposal (`aiConversation.service.js:124-132`); no focused test demonstrates repeated rejected/ambiguous turns reach a stable terminal state without a new clarification question. The rejection fingerprint prevents rebuilding the same proposal (`:184-189` plus `aiRelaxationPolicy.service.js:8-10`), but the residual clarification path still needs a sequence-level assertion. Add one test before/with F; no code change is required by this audit conclusion.

## Diversification quality

Input is bounded by schema, IDs are deduplicated, output stays at five or fewer, and unavailable candidates are not introduced (`aiRecommendationDiversification.service.js:17-30`). Effective final price is used for price bands (`:4-5`). Candidates with a gap greater than ten receive no utility (`:9-14`); under-five and homogeneous inputs fill from ranked candidates rather than dropping capacity (`:20-28`). Constraints remain enforced because input is Stage-1 eligible only.

Threshold 10 and max bonus 6 are reasonable initial internal constants, but require catalog evaluation before rollout. Beyond R1, no evidence shows diversity pulls a candidate more than the near-score allowance. The service has no representative real-catalog fixture; current tests cover synthetic color and price variation only.

## Grounded reasons

The reason schema is closed, max three codes, and facts are backend-derived (`aiRecommendationReason.schema.js`; `aiRecommendationReason.service.js:16-34`). Budget, stock, promotion and review claims each have guards: budget uses effective price (`:4-6,23`), stock requires `> 0` (`:24,32`), promotion requires `hasPromotion === true` (`:25,32`), and high review needs rating ≥4.5 with ≥5 reviews (`:30`). Writer JSON is strict; unknown fields fail parsing, disallowed IDs/codes/duplicates are skipped, prose is bounded and rejects digits/angle brackets, and fallback uses deterministic backend prose (`:37-48`). Product order and DTO are never writer-owned (`aiAdvisor.service.js:839-848`).

**Medium finding M2 — semantic prose remains only partially grounded.** A writer reason may use a valid code while asserting an unrelated non-numeric fact; `safeWriterText` checks only length, digits, and angle brackets (`aiRecommendationReason.service.js:37-44`). The prompt constrains it (`aiAdvisor.service.js:627-650`), but code cannot fully fact-check natural language. This is explicitly a known E6 limitation, not evidence of full hallucination prevention. Prefer deterministic per-code prose for product reasons in high-trust contexts, or add constrained template slots/evaluation in Phase G.

## Session safety, idempotency, and memory

The store deep-clones the full session before work and atomically replaces it only when ID/generation still match (`aiConversationSession.store.js:16-20`; `aiConversation.service.js:117-118,191-201`). Queue serialization, duplicate receipt cache, 24-hour TTL, 20-turn cap, LRU bound, and reset receipts are present (`aiConversation.types.js:3-20`; `aiConversationSession.store.js:2-14,20`). Comparative and relaxation state are bounded (`aiConversation.types.js:17-20`); only final selected recommendation context is written (`aiConversation.service.js:192-195`). Candidate artifacts, grounded facts, and diversification diagnostics are returned internally only and are not stored in the session. No-result leaves recommendation context untouched (`aiConversation.service.js:194`).

Focused transaction tests cover Stage-1 rollback, invalid-response rollback, exclusion/stock rollback, comparative rollback, reset, duplicate and stale behavior (`backend/tests/h3.ai-conversation-transaction.test.js`). Stage-2 writer failures are caught into deterministic fallback before commit (`aiAdvisor.service.js:838-853`). A duplicate cached response does not rerun processing because cache lookup precedes Stage 1 (`aiConversation.service.js:115`).

## Call-count and performance

Recommendation path wiring is one Stage 1 preparation followed by one Stage 2 completion (`aiAdvisor.service.js:814-855`). Stage 2 does one batch review aggregation, one ranking, one selection seam, one diversification and reason build, one writer, and one validator (`:817-842`; direct proof `backend/tests/h3.ai-advisor-stage-call-count.test.js`). Candidate retrieval is capped at 50 (`aiAdvisor.service.js:15-16`); eligibility/comparative/diversity/reasons are O(n), sorting O(n log n). No new Prisma/provider call is introduced by E6. Clarification/no-result/relaxation return before completion (`aiConversation.service.js:169-189`).

Prompt payload is selected top-N plus bounded reason facts (`aiAdvisor.service.js:590-650`); it does not include full catalog, exclusions or session internals. There is no new N+1 query in E6.

## Security and privacy

| Severity | Finding | Evidence / disposition |
| --- | --- | --- |
| Critical | None found in audited AI path | No model-selected product/DB write path. |
| High | R1 explicit-sort/tie break violation | Correctness blocker before F. |
| High | R2 free-text size inference as hard filter | Trust/correctness blocker before F. |
| Medium | M1 relaxation terminal sequence unproven | Add state-sequence regression. |
| Medium | M2 writer prose semantic claim gap | Deterministic fallback exists; add evaluation/template hardening. |
| Low | Diversity threshold lacks representative catalog calibration | Address with evaluation/telemetry, not a silent weight change. |

Message and model output are treated as untrusted through strict intent, comparative, reason, and response schemas. Writer payload omits raw product descriptions, PII, excluded/rejected candidates and secrets (`aiAdvisor.service.js:590-650`). User-message summaries remain bounded in session (`aiConversation.service.js:195`). Provider error logging uses error metadata but should be rechecked in Phase F to ensure no raw prompt reaches observability.

## Test quality

Direct Stage 1/Stage 2 tests call production exported functions with injected dependencies (`backend/tests/h3.ai-advisor-stage-call-count.test.js`). Route/controller tests preserve additive contracts (`h3.ai-advisor-controller-contract.test.js`). Transaction/idempotency tests use the real in-memory store and production conversation function (`h3.ai-conversation-transaction.test.js`; `h3.ai-clarification-response.test.js`). Writer tests correctly exercise strict code/ID validation (`h3.ai-writer-grounding.test.js`).

Gaps: no full database-backed suite in this audit; no price-desc/rating/newest diversification regression; no exact size-name/description rejection fixture; no repeated ambiguous/reject relaxation sequence; no Vietnamese evaluation corpus for factual writer prose; and synthetic diversity fixtures do not measure real catalog variety. These are stronger gaps than interaction-mock concerns.

## Manual evaluation matrix

| Input | Session state | Expected hard filters | Expected action | Expected product behavior | Expected response |
| --- | --- | --- | --- | --- | --- |
| “Sofa dưới 10 triệu” | empty | active, sofa, max 10m | recommend | final price ≤10m | recommendation |
| “Sofa màu xanh” | empty | active, sofa | recommend | non-blue remains eligible; blue scores | recommendation |
| “Chỉ lấy sofa màu xanh” | required color | active, sofa, blue | recommend/no-result | non-blue absent | recommendation/proposal |
| “Không lấy màu trắng” | exclusion white | exclusion white | recommend | white absent | recommendation |
| “Sofa còn hàng” | stockRequired true | stock >0 | recommend/no-result | zero/null/negative stock absent | recommendation/proposal |
| “Sofa 5 triệu” | explicit budget | budget range | recommend | effective promotion price used | recommendation |
| “Rẻ hơn mẫu thứ hai” | IDs/prices [1..] | cheaper + prior hard constraints | recommend/no-result | strictly below ordinal price | recommendation/proposal |
| “Đắt hơn mẫu này” | current product price | more-expensive + budget | recommend/no-result | strictly above reference but within budget | recommendation/proposal |
| “Màu khác mẫu trước” | dominant colors | existing hard filters only | recommend | same color remains eligible but no bonus | recommendation |
| “Chất liệu khác” | no material reference | none | clarify | no inferred material | clarification |
| “Nhỏ hơn” | no normalized size | none | clarify | no name-derived hard size | clarification after R2 fix |
| “Mẫu khác” | prior IDs | different-product | recommend/no-result | prior IDs absent | recommendation/proposal |
| “Mẫu thứ sáu” | five IDs | none | clarify | no arbitrary ID | clarification |
| “Còn hàng không?” | no reference | none | clarify | no stock global mutation | clarification |
| “Bỏ màu bắt buộc” after no result | pending one option | unchanged before consent | proposal | no candidate change | relaxation_proposal |
| “Đồng ý” for one option | pending one option | applied field only | rerun once | newly eligible candidates allowed | recommendation/no-result |
| “Ok” for two options | pending two options | unchanged | ask choose | no pipeline rerun | relaxation_proposal |
| “Giữ nguyên” | pending proposal | unchanged | terminal guidance | no proposal apply | no_result |
| repeated rejected request | rejected fingerprint | unchanged | stable terminal | no repeated proposal/question | target regression M1 |
| writer malformed/timeout | selected backend products | unchanged | fallback | IDs/order/prices preserved | recommendation |

## Findings and Go/No-Go Phase F

### Required before Phase F

1. Fix R1 so diversification never reorders explicit sorts or discards E2 comparator tie fields; add direct regression tests.
2. Fix R2 so comparative size uses normalized product size only; add a no-name/no-description-inference regression.

### Improvements that can be deferred

- Add M1 terminal rejection/ambiguous sequence test and decide whether a rejected state is terminal immediately.
- Replace free prose reasons with per-code templates or add Vietnamese factual-claim evaluation (M2).
- Calibrate diversity threshold/utility on a representative catalog, preferably through Phase F/G telemetry/evaluation rather than changing weights blindly.
- Add database-backed integration coverage when a safe test database is available.

### Verdict

**NO-GO for Phase F until R1 and R2 are corrected and their focused regression tests pass.** The existing architecture is otherwise appropriate: backend authority, hard filters, copy-on-write state, bounded memory, and short-circuiting are preserved. After the two fixes, Phase F telemetry can observe quality without changing authority.
