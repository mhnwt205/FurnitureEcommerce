# Phase B — Structured Intent Extraction

## Scope

Implemented internal structured intent extraction only. No API response field, frontend chatbot UX, session/history, clarification, recommendation ranking, stock rule, promotion/review DTO, Prisma schema or migration was changed.

## Architecture implemented

- `aiIntent.taxonomy.js`: closed taxonomy and legacy↔canonical mappings.
- `aiIntent.schema.js`: strict Zod object; no unknown keys; VND integer budget; non-negative budget; `min <= max`; confidence in `[0,1]`.
- `aiIntentExtraction.service.js`: separate Gemini NLU request with JSON response MIME type, temperature `0.1`, 8-second timeout, maximum two attempts and safe null fallback.
- `aiAdvisor.service.js`: constructs an internal fallback intent from the existing parser. When NLU is unavailable/invalid, it deliberately uses the original legacy parser values, preserving Phase A retrieval/ranking/wording behavior. When NLU validates, canonical fields map into the existing legacy filters; recommendation authority remains backend-only.

## Internal intent contract

`{ intentType, category, budget:{min,max,currency:'VND'}, room, style, colors, materials, size, stockRequired, sortPreference, constraints, confidence, missingImportantFields, ambiguousFields }`.

Category, room, style, color, material, size and sort are closed enums. Product ID, price, stock, promotion, actions and arbitrary fields are not part of the schema and strict validation rejects them.

## Gemini NLU contract

Input is limited to user message, optional numeric `currentProductId`, closed taxonomy and response shape. It excludes catalogue, price, stock, promotion, PII, history and secrets. Model output is fence-stripped, JSON parsed and Zod-validated. Timeout, HTTP failures, malformed JSON, wrong types, extra keys, invalid confidence and taxonomy hallucination all return `null` and select legacy fallback. The existing Gemini writer still only receives backend-selected recommendations.

## Compatibility and fallback

The public controller still returns exactly `{ answer, recommendations }` (`backend/controllers/aiAdvisor.controller.js:11-14`). With no NLU API key or invalid NLU response, `getAdvisorResponse` keeps `fallbackBudget`, `fallbackCategorySlug` and `fallbackAttributes`, rather than round-tripping them through canonical mapping. This avoids changing current “around” wording/score behavior documented by Phase A.

## Tests

- `h3.ai-intent.test.js`: strict schema, closed taxonomy, full/partial intents, Vietnamese canonical cases, fence/malformed JSON, retry, HTTP/timeout/no-key fallback and prompt data minimization.
- Phase A characterization, existing Gemini resilience and existing route rate-limit tests all remain green in focused execution: 28/28.
- No real Gemini request, database query, migration, seed or truncate was run.

## Database status

`backend/.env` has a configured Azure `DATABASE_URL`; `TEST_DATABASE_URL` is absent. Local SQL Server credentials/authentication were not supplied and were not guessed. No `.env` changes were made. Full `npm.cmd test` remains environment-blocked by its deliberate isolated-test-DB guard.

## Known limitations

No session/history/clarification; no raw-text typo/number-word improvements; no production Gemini live validation; NLU fields `stockRequired`/`sortPreference` are internal only and intentionally do not change current ranking in Phase B. Existing substring parser limitations remain the fallback baseline.

## Done criteria and Phase C readiness

Phase B is complete for strict schema, closed taxonomy, validated NLU, safe fallback and unchanged API contract. Phase C can begin after confirming guest/authenticated session ownership, TTL and concurrent-message policy; it must not reuse refresh tokens as AI session IDs.
