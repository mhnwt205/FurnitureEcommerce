# Phase G — AI Evaluation, Benchmarking and Quality Gates

## Scope

Phase G adds an offline, deterministic quality harness only. It does not call Gemini, Prisma, or a production database, and does not alter recommendation behaviour.

## Dataset and fixture

`backend/evaluation/datasets/vi-v1.json` contains 100 versioned Vietnamese cases: 10 basic, 15 budget, 10 typo/diacritics, 10 hard/soft, 10 clarification, 8 exclusion/stock, 12 comparative, 10 relaxation, 8 multi-turn, and 7 safety cases. The strict Zod contract rejects malformed and duplicate IDs. `fixtures/products.vi.json` is a bounded catalog covering effective promotion prices, stock edge cases, canonical attributes, equal-like candidates, and references.

## Architecture

The runner composes narrow evaluators for intent, policy/action, recommendation validity/determinism, grounded-reason validity, and telemetry-safe privacy. It imports production parsing/comparative/policy seams rather than duplicating their decision algorithms. Fixture recommendation validation is deliberately a validator, not a second ranking implementation.

## Gates

Hard gates are 100% hard-constraint validity, no invalid or duplicate IDs, deterministic replay, and zero fixture privacy leakage. A versioned baseline records metric values only through the explicit `test:ai-eval:update-baseline` command. A decline greater than two percentage points produces a failing regression gate; normal evaluation never rewrites the baseline.

Soft metrics are informational until labelled fixtures have sufficient supported coverage: category, budget, comparative type, action, and clarification-field accuracy. Unsupported cases are reported separately and never treated as passes.

## Commands and reports

From `backend`:

```powershell
npm.cmd run test:ai-eval
npm.cmd run test:ai-eval:update-baseline
node evaluation/runAiEvaluation.js --tag comparative --json evaluation/reports/comparative.json --markdown evaluation/reports/comparative.md
```

The runner writes a machine-readable JSON report and Markdown summary under the ignored `evaluation/reports/` directory. It exits nonzero on a hard or regression gate failure.

## Privacy and determinism

The dataset uses fake PII and a fake key only. Reports expose IDs, aggregate metrics, tags, and failed IDs—not raw messages, prompts, products, keys, or session state. The harness has direct tests that detect invalid IDs, hard-constraint violations, duplicate IDs, nondeterministic ordering, privacy leakage, invalid schema, duplicate case IDs, filtering, and baseline regression.

## Limitations and Phase H readiness

Offline NLU measurements use deterministic production fallback seams; Gemini quality is intentionally not measured. The current fixture validator guards recommendation output validity but does not replace the existing production Stage 1/Stage 2 ranking test suite. Labels for some conversational and unsupported Vietnamese phrasings are informational until curated further. This is sufficient for Phase H: it supplies versioned, repeatable gates without widening frontend/API scope.
