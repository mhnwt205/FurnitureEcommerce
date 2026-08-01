# AI Phase E5 — Consent-Based Constraint Relaxation

## Scope

E5 adds deterministic pending relaxation proposals for specific no-result reasons. No constraint is changed until a stored proposal receives valid consent. Gemini does not build, select or apply options.

## Contract and handlers

`aiRelaxation.schema.js` provides strict bounded proposal/state schemas. Policy, consent and application each use focused registries: no-result reason handlers, phrase rules and option-type application handlers. Options are capped at three and proposal IDs are opaque/non-user-derived.

## Consent and application

Single-option proposals accept explicit affirmative consent; multi-option proposals require an explicit ordinal. Reject/ambiguous replies do not mutate constraints. Application executes against the working session copy and only changes the selected field (for example stock requirement, a bounded budget maximum, one exclusion, required attribute, or comparative state).

## Session and loop control

`relaxationState` stores only one bounded pending proposal, one last-applied ID and at most five rejected IDs. Proposals expire after three turns. A rejected proposal is not regenerated for the same deterministic state fingerprint; an ambiguous answer repeats the stored options without applying them. Reset, TTL/rotation and a successful application clear the pending state. Commit remains copy-on-write and generation-checked, so a failed Stage 1 or stale session cannot persist an application.

## Response contract

`relaxation_proposal` is an additive, strict internal response: it always includes a string `answer`, an empty `recommendations` array, session metadata, and one to three bounded `{ id, label }` options. Existing recommendation, clarification and terminal no-result contracts remain unchanged. The controller forwards the additive response unchanged.

## Budget

Budget proposals use an integer nearest effective-price boundary when supplied; otherwise bounded 10%/20% increases. No price is calculated by Gemini and no budget is committed before consent.

## Pipeline and response

Specific no-results produce additive `relaxation_proposal` responses with `answer`, `recommendations: []`, session metadata and up to three user-facing option labels. Proposal creation remains on the Stage 2 short-circuit path. An accepted option enters the normal single Stage 1 execution; Stage 2 runs only if a recommendation remains appropriate.

## Authority, safety and limitations

State remains copy-on-write and is committed atomically with existing generation/idempotency guards. Reset creates a clean relaxation state. Rejected IDs are bounded. Current E5 intentionally has no frontend option UI; a client can still use `answer`/`recommendations` safely. Consent wording is deliberately narrow and no free-text product ID is accepted.

## Tests and call counts

Policy generation, consent ambiguity, option application immutability, controller pass-through, clarification-proposal response and transactional regressions are covered. Proposal creation executes Stage 1/Summary/Policy once and never Stage 2; acceptance applies once to the working copy, then executes the normal pipeline once. Existing Stage split, comparative, eligibility and session tests remain green.

## Readiness E6

E6 can add diversification and factual writer grounding without changing consent authority or proposal state.
