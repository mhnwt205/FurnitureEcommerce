# AI Advisor code-quality audit before E4

## Scope and method

This is a static audit only. It covers the eight requested AI services, their ownership boundaries and repeated decision rules; no production behavior, API, ranking weight or test was changed. Line references below are based on the current working tree.

## Conditional inventory

| File | Lines | `if` | `else` / `else if` | ternary expressions | `switch` |
|---|---:|---:|---:|---:|---:|
| `aiConversation.service.js` | 175 | 37 | 4 | 21 | 0 |
| `aiAdvisor.service.js` | 878 | 95 | 9 | 79 | 0 |
| `aiCandidateEligibility.service.js` | 107 | 10 | 1 | 21 | 0 |
| `aiClarification.policy.js` | 15 | 4 | 0 | 3 | 0 |
| `aiConversationOperation.service.js` | 11 | 0 | 0 | 2 | 0 |
| `aiConstraintClassification.service.js` | 55 | 0 | 0 | 15 | 0 |
| `aiComparativeExtraction.service.js` | 39 | 12 | 11 | 2 | 0 |
| `aiComparativeReference.service.js` | 56 | 6 | 2 | 9 | 0 |

The counts are syntactic signals, not defects: in particular, `aiAdvisor.service.js` contains legacy parsing, pricing, retrieval, ranking, serialization and Gemini integration in one module.

## Conditionals that are appropriate business rules

- Clarification precedence is deliberately short and readable: conflict, zero candidates, missing category, then broad category-without-budget in [`aiClarification.policy.js`](../../../backend/services/aiClarification.policy.js:5). Its ordered `if` chain is policy, not accidental complexity.
- Eligibility must use a deterministic ordered pipeline—budget, explicit/required attributes, exclusions, then `stockRequired`—in [`aiCandidateEligibility.service.js`](../../../backend/services/aiCandidateEligibility.service.js:43). The diagnostic counts depend on this exact sequencing; replacing it with an unordered filter map would obscure the no-result cause.
- Atomic conversation guards for reset receipts, cache/idempotency, stale generation and commit are legitimate orchestration branches in [`aiConversation.service.js`](../../../backend/services/aiConversation.service.js:88). They protect C.6 invariants and should remain explicit.
- The comparative resolver's source priority—ordinal, explicit current product, then recent recommendations—is an intentional authority rule in [`aiComparativeReference.service.js`](../../../backend/services/aiComparativeReference.service.js:20).
- The final comparator's ordered checks are appropriate deterministic ranking semantics in [`aiAdvisor.service.js`](../../../backend/services/aiAdvisor.service.js:745): it makes the ID a stable final tie-breaker.

## Conditionals recommended for refactoring

| Area | Evidence | Concern | Minimal remedy |
|---|---|---|---|
| Comparative phrase chain | [`aiComparativeExtraction.service.js`](../../../backend/services/aiComparativeExtraction.service.js:17) | Twelve ordered branches become fragile when E4 adds comparative qualifiers. Precedence is implicit. | Replace only the phrase chain with an ordered `COMPARATIVE_PATTERNS` handler list `{ type, test, ambiguous? }`; keep ordinal/stock precedence explicit and tested. |
| Operation recognition | [`aiConversationOperation.service.js`](../../../backend/services/aiConversationOperation.service.js:7) | A nested ternary carries clear/exclude/append/replace precedence for both fields; adding new operations will duplicate it. | Use an ordered operation-rule table and field configuration (`clearPatterns`, `excludePatterns`, etc.). |
| Terminal no-result copy | [`aiConversation.service.js`](../../../backend/services/aiConversation.service.js:36) and [`aiClarificationQuestion.service.js`](../../../backend/services/aiClarificationQuestion.service.js:10) | Reason-to-user-text mappings exist in two places and can drift. | Introduce one internal `noResultPresentation` lookup that returns terminal guidance and optional clarification template. Keep response type selection in conversation orchestration. |
| Conversation main flow | [`aiConversation.service.js`](../../../backend/services/aiConversation.service.js:88) | One function owns lifecycle, merge, exclusions, comparative state, candidate execution, clarification branch, cache and commit. E4 would add comparative branching here. | Extract pure helpers for `applyTurnToWorkingSession`, `resolveConversationDecision`, and `finalizeWorkingSession`; retain queue/clone/commit in the public orchestrator. |
| Advisor legacy module | [`aiAdvisor.service.js`](../../../backend/services/aiAdvisor.service.js:81), [`aiAdvisor.service.js`](../../../backend/services/aiAdvisor.service.js:467), [`aiAdvisor.service.js`](../../../backend/services/aiAdvisor.service.js:657), [`aiAdvisor.service.js`](../../../backend/services/aiAdvisor.service.js:773) | 878 lines cover unrelated parsing, product matching, pricing, scoring, writer protocol and both pipeline stages. This is the principal god-service risk. | Before adding comparative scoring, extract a pure scorer module/registry and share price/attribute primitives; do not change Stage 1/2 contracts. |
| Attribute scoring chain | [`aiAdvisor.service.js`](../../../backend/services/aiAdvisor.service.js:406) | Repeated field-specific `if/else` scoring is data-shaped but represented as code. | Use a scorer registry with field descriptor, direct bonus, text bonus, product field and canonical terms. Preserve existing constants exactly. |

## Duplicated or drifting rules

| Rule | Evidence | Risk | Recommendation |
|---|---|---|---|
| Vietnamese normalization | [`aiAdvisor.service.js`](../../../backend/services/aiAdvisor.service.js:81), [`aiCandidateEligibility.service.js`](../../../backend/services/aiCandidateEligibility.service.js:3), [`aiConversationOperation.service.js`](../../../backend/services/aiConversationOperation.service.js:5), [`aiComparativeExtraction.service.js`](../../../backend/services/aiComparativeExtraction.service.js:3), [`aiComparativeReference.service.js`](../../../backend/services/aiComparativeReference.service.js:20) | Accent/`đ` handling can diverge. | Shared pure `normalizeVietnameseText`; keep text-matching policy local. |
| Effective-price / budget comparison | [`aiAdvisor.service.js`](../../../backend/services/aiAdvisor.service.js:438), [`aiAdvisor.service.js`](../../../backend/services/aiAdvisor.service.js:460), [`aiCandidateEligibility.service.js`](../../../backend/services/aiCandidateEligibility.service.js:34), [`aiCandidateSummary.service.js`](../../../backend/services/aiCandidateSummary.service.js:2) | Eligibility, scoring, serialization and summary could use different fallback price fields. | Shared `getEffectivePrice` and `matchesBudget` primitives, imported by each owning layer. |
| Canonical bounded array handling | [`aiCandidateEligibility.service.js`](../../../backend/services/aiCandidateEligibility.service.js:10), [`aiConstraintClassification.service.js`](../../../backend/services/aiConstraintClassification.service.js:4), [`aiComparativeReference.service.js`](../../../backend/services/aiComparativeReference.service.js:4) | Multiple implementations of dedupe/filter/slice. | Shared taxonomy canonicalization helper with caller-specific maximum supplied explicitly. |
| No-result mapping | [`aiCandidateSummary.service.js`](../../../backend/services/aiCandidateSummary.service.js:2), [`aiClarification.policy.js`](../../../backend/services/aiClarification.policy.js:5), [`aiClarificationQuestion.service.js`](../../../backend/services/aiClarificationQuestion.service.js:10), [`aiConversation.service.js`](../../../backend/services/aiConversation.service.js:36) | Summary decides reason, policy collapses to `no_candidate`, and response layers separately map wording. | Retain summary as authority for reason; use one lookup table for reason presentation and have policy receive the canonical reason list. |
| Required-strength phrase detection | [`aiConversation.service.js`](../../../backend/services/aiConversation.service.js:46) and [`aiConstraintClassification.service.js`](../../../backend/services/aiConstraintClassification.service.js:8) | Strength is partly detected by orchestration and partly interpreted by classifier. | Create one strength resolver owned by constraint classification; conversation merely supplies operation/message-derived evidence. |

## Service and god-service risks

### High: `aiAdvisor.service.js`

It is the only file above the review signal of roughly 1,000 lines and is already close at 878 lines. It has at least eight responsibilities: fallback parsing, taxonomy matching, price/promotion facts, Prisma/review access, retrieval planning, eligibility adapters, ranking, DTO/reason construction and Gemini transport. E4 comparative scoring would make this materially worse if appended to `scoreProduct` or `compareRankedCandidates`.

### Medium: `aiConversation.service.js`

The module is only 175 lines, but `processAiConversation` combines transactional session mechanics with all product-flow branching. This is manageable today because helpers are injected, but comparative state at lines 125–130 is feature-specific logic in a shared orchestration path. E4 should add its decision as a dedicated pure helper, not as another branch in this function.

### Low: eligibility, clarification, operation, classification and comparative services

These files are focused. Their compact conditionals encode ordered policy and should not be split merely for style. The operation recognizer and comparative extractor are candidates for data-table dispatch once their phrase sets expand; extracting them now would not reduce enough complexity to justify risk.

## Proposed handler / pipeline / registry boundaries

1. **Recognition handler maps (E4-ready, optional now)**
   - `comparativePhraseRules`: ordered phrase rule objects; ordinal and stock qualifiers remain first-class pre-processing.
   - `conversationOperationRules`: per-field rules with explicit precedence rather than nested ternaries.

2. **Eligibility rule pipeline (keep existing order)**
   - `budgetRule → requiredAttributesRule → exclusionsRule → stockRequiredRule`.
   - Each returns `{ candidates, diagnosticsPatch }`. This preserves first-failing-stage semantics and makes E4 comparative filters insertable only after the agreed E4 policy position.

3. **Scorer registry (recommended as the first E4 internal refactor)**
   - A fixed ordered registry for stock, category, budget, current-product similarity, keyword, price hint and soft attributes.
   - Each scorer returns a numeric delta; the current comparator remains responsible for sort preference and final ID tie-breaker. Constants must be carried unchanged and characterization tests must lock them.

4. **Reason/presentation lookup**
   - A single `NO_RESULT_PRESENTATION[reason]` owns terminal wording and relaxation question content/options. `candidateSummary` remains the reason authority; controller/API still only consume a built response.

## Refactor requirement before E4

No blocking refactor is required before E4: Stage 1/Stage 2 seams, dependency injection, strict internal contracts and deterministic comparator already provide a safe insertion point. **Go with a guardrail:** E4 must not add comparative filtering/scoring directly into the existing `scoreProduct` conditional chain or `processAiConversation`; it should introduce the scorer/rule helper within the E4 change. The duplicated normalization/price/presentation helpers can be a small follow-up hardening task because changing them now risks broad baseline drift without enabling E4.

## Go / No-Go E4

**GO.** There is no correctness, security, API, database or test blocker. The main quality risk is preventable architectural growth in `aiAdvisor.service.js`; follow the registry/pipeline guardrail when implementing E4.
