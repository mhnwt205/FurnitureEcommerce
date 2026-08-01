# Reference-Informed Migration Plan

This is a proposal only; no migration is implemented by this audit.

## 1. Preserve current E4 foundation

- Files: existing comparative, eligibility and scorer seams.
- Change: implement E4 through a deterministic scorer/rule helper, not through a reference-style model prompt.
- Risk: accidental ranking drift.
- Tests: direct Stage 1/Stage 2 call counts, comparative fixture matrix, baseline deep equivalence.
- Done: comparative behavior is backend-controlled and no extra provider/DB call exists.

## 2. Optional provider/prompt ownership cleanup

- Files: future AI provider/prompt modules only.
- Change: centralize provider configuration and named prompt builders behind existing injected dependencies.
- Risk: retry/fallback behavior drift.
- Tests: provider mock, malformed output, timeout/retry, allow-list and prompt snapshot tests.
- Rollback: retain existing call implementation behind one adapter switch.

## 3. Phase H UX adaptation

- Files: frontend advisor component/services.
- Change: add the reference's proven local loading/auto-scroll convenience, plus FurnitureEcommerce sessionId persistence, option buttons, reset and terminal state.
- Risk: duplicate submissions and stale UI.
- Tests: response-contract rendering, sequential/concurrent click handling, localStorage/reset behavior.
- Rollback: continue rendering mandatory `answer` and `recommendations` only.

## 4. Deferred retrieval/tools exploration

- Preconditions: an evaluation set, authorization design, catalog freshness requirements and operational telemetry.
- Shadow mode: compare a deterministic backend result with an experimental retrieval/tool output; do not expose experimental IDs.
- Feature flag: server-side only, default off.
- Rollback: disable the flag; the current Stage 1/Stage 2 path remains canonical.

## Roadmap impact

No roadmap reorder is justified. Keep E4 comparative filtering/scoring, E5 consent-based relaxation, E6 diversification/grounded explanation, E7 audit, then F telemetry, G evaluation and H frontend multi-turn. The reference reinforces—not replaces—the need for F/G before considering RAG, tools or streaming.
