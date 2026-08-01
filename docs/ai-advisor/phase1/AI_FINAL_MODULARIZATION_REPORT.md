# AI Advisor Final Modularization

## Scope and inventory

The former flat `backend/services/ai*.js` implementation consisted of 40 files: the largest were advisor/recommendation orchestration (46,939 bytes) and conversation orchestration (23,363 bytes); all other files had one feature responsibility. Consumers were the advisor controller, app metrics hook, evaluation modules and H3 AI tests. No dynamic imports or pre-existing circular imports were found in the static inventory.

## Target structure and mapping

All production implementation now lives under `backend/services/ai-advisor/`: `conversation`, `intent`, `clarification`, `candidates`, `recommendation`, `comparative`, `relaxation`, and `telemetry`. Old flat filenames were moved according to the requested old-to-new mapping; new filenames omit the redundant `ai` prefix. The retained `index.js` is intentionally narrow: controller/orchestrator, session store, recommendation stage seams and metrics/telemetry integration only.

## Migration and dependency findings

Migration was mechanical in five dependency batches: intent, conversation/clarification, candidates/recommendation, comparative/relaxation, then telemetry/evaluation/tests. Relative imports were rewritten to feature paths. Controller now imports through the feature entry point; app, evaluation and tests import their specific feature owners. No compatibility shims remain, so no duplicate implementation remains in the flat services directory.

Low-level folders do not import controller/app/frontend. Telemetry does not import conversation; session storage does not import controller. Provider code intentionally remains in intent extraction/recommendation advisor because moving it would be non-mechanical and risk retry/fallback drift.

## Shared/merge decisions

No behavior-changing shared-helper consolidation was performed. Existing duplicated normalization/pricing helpers were retained inside their feature owners because centralizing them would exceed a path-only migration. No independent services were merged.

## Equivalence and regression evidence

The Stage 1/Stage 2 DI seam and intent regression run after the move. The complete focused AI/rate/metrics suite, offline evaluation, Prisma validation, frontend tests/build and `git diff --check` are run for final verification. Tests retain the same exports, expected response contracts, ranking/order, telemetry event names and evaluation baseline.

## Remaining structural limitations

`recommendation/advisor.service.js` and `conversation/conversation.service.js` remain their original large orchestrators by design; splitting their business operations is a future behavior-reviewed task, not part of this move-only modularization. No old compatibility shims are retained.
