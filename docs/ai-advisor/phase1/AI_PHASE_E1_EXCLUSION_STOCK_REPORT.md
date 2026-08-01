# Phase E1 — Exclusion Enforcement and `stockRequired` Hard Filter

## Scope

E1 enforces canonical session exclusions and explicit availability as backend eligibility constraints. It does not change Prisma schema, retrieval order, ranking weights, frontend, comparative behavior, diversification, or Gemini authority.

## Exclusion policy

Stage 1 applies exclusions after the existing budget and positive-attribute filters. Canonical category, color, material, and style values are checked against their closed taxonomies; a candidate is removed when any of its canonical values is excluded. Unknown catalogue values are ignored rather than inferred or used to exclude a candidate. Positive/excluded overlap is resolved conservatively: exclusion wins at eligibility.

Implementation: `backend/services/aiCandidateEligibility.service.js`. Conversation passes the copy-on-write working-session `excluded` object to Stage 1 (`backend/services/aiConversation.service.js`). No raw user text is sent to eligibility.

## Stock policy

`stockRequired === true` now retains only candidates for which `Number(stock) > 0`. Zero, negative, null, undefined, `NaN`, and nonnumeric stock are unavailable for this explicit constraint. With `stockRequired` absent or false, E1 does not hard-filter stock; the existing ranking bonus remains unchanged.

The explicit phrase `không cần còn hàng` / `không bắt buộc còn hàng` clears a previously stored stock requirement. An omitted boolean retains the session value, avoiding a Gemini/default `false` from silently weakening the hard constraint.

## Eligibility order and diagnostics

The deterministic order is:

1. Budget eligibility.
2. Existing positive-attribute eligibility.
3. Exclusion eligibility.
4. Explicit `stockRequired` eligibility.

The Stage-1 artifact records before/after counts for each stage plus `exclusionApplied` and `stockRequired`. Filtering is one pass per stage over the capped candidate array and does not add Prisma calls or rerun enrichment.

## New no-result reasons

Candidate Summary now has closed reasons `excluded_only` and `out_of_stock_only`, alongside its prior reasons. It chooses the first stage that actually emptied an otherwise viable candidate set, so `unknown` is never paired with a concrete cause. Summary adds nullable `exclusionMatched` and `stockMatched`; neither is exposed in API responses.

`excluded_only` and `out_of_stock_only` use deterministic relaxation text. They never clear exclusions or set `stockRequired` false. At the two-question cap, existing terminal no-result behavior applies and no question is repeated.

## Session transaction safety

The exclusion object passed to Stage 1 is from the working-session clone. If Stage 1 fails, the atomic copy-on-write commit path leaves persisted exclusions, `stockRequired`, intent, turn count, idempotency cache, and clarification state unchanged. Successful recommendations update context only with products that survived the hard filters.

## Call-count evidence

The existing direct Stage 1/Stage 2 DI tests still prove Stage 1 does retrieval/enrichment/eligibility once and Stage 2 alone does review/rank/select/writer. E1 no-result integration asserts recommendation completion is not called; therefore review/ranking/writer remain skipped on exclusion/stock clarification paths.

## Tests

`h3.ai-exclusion-stock.test.js` covers category/color/material/style exclusions, multiple exclusions, unknown values, positive/exclusion precedence, stock zero/negative/null/undefined/NaN/numeric-string behavior, default-stock compatibility, Stage-1 forwarding, and no-result short-circuit. Candidate Summary tests cover both new exact reasons and invalid diagnostics. Transaction tests prove exclusion/stock changes roll back on Stage-1 failure.

Focused AI/rate regression passed 68/68; Prisma validation, frontend tests/build, and `git diff --check` passed.

## Remaining limitations and readiness E2

Category/style exclusion operations are not newly expanded in E1; the hard filter correctly enforces canonical values already present in session state. Exclusion is not a comparative feature. Ranking remains unchanged and has no final deterministic ID tie-breaker; that is E2. Gemini free-form claims remain type/allow-list constrained but not fact-grounded; that is later E6 work.

**Ready for E2**: the Stage-1 boundary now distinguishes hard eligibility from the existing soft ranking preference without changing public response compatibility.
