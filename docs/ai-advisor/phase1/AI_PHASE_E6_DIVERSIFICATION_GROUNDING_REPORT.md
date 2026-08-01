# AI Phase E6 — Recommendation Diversification and Grounded Explanations

## Scope

E6 adds deterministic top-N diversification and backend-grounded recommendation reasons without changing candidate retrieval, hard eligibility, base ranking weights, public request shape, or frontend code.

## Diversification contract and selection

`aiRecommendationDiversification.service.js` accepts ranked backend candidates and produces at most five unique products plus internal diagnostics. It never mutates ranked input. The greedy strategy keeps the best relevance candidate first, gives at most a small bounded utility to price-band/color/material/style novelty within a ten-point score gap, and fills remaining slots in deterministic rank order. Explicit price, rating, and newest sorts bypass diversity reordering.

## Grounded reason contract

`aiRecommendationReason.schema.js` closes the reason-code vocabulary and validates bounded backend facts. Facts are built only from selected backend candidates, canonical request context, and comparative policy. At most three reasons are chosen deterministically: comparative evidence, category/hard match, budget, stock, promotion, attributes, then qualified reviews. The response continues to use the existing recommendation `reason` field.

## Writer grounding

The Gemini prompt now contains only selected safe DTO facts, backend-issued reason codes/facts, allow-listed IDs, and a strict response format. Its structured output may only contain `answer` and per-product prose with a subset of issued reason codes. Unknown keys, IDs, codes, duplicate IDs, numeric claims, HTML-like text, malformed JSON, missing output, timeout, or provider failure fall back to centralized deterministic Vietnamese reasons. Writer order is remapped to backend recommendation order; it cannot change DTO fields.

## Stage 2 and call counts

Stage 2 remains: review aggregation → base ranking/sort → selection seam → diversification → reason-fact builder → writer. No retrieval, enrichment, eligibility, or comparative filtering is repeated. The injected production Stage-2 test directly proves one call each to reviews, ranking, selection, diversification, reason building, and writer. D4/E5 clarification, no-result, and relaxation paths never enter Stage 2.

## Compatibility and session safety

Recommendations retain `answer`, `recommendations`, existing prices, stock, ordering authority, and DTO fields. The session context receives the final selected recommendations only; artifacts and grounding facts are not stored in session. Copy-on-write, generation checks, idempotency, and writer-fallback commit semantics are unchanged.

## Security and limitations

No full catalog, excluded candidates, session internals, PII, provider secrets, score weights, or raw product descriptions are sent to the writer. This constrains structured facts and codes; it does not claim perfect natural-language hallucination detection. E7 should audit real-catalog diversity calibration and writer-language evaluation before broad rollout.

## Tests

Focused tests cover uniqueness, bounded/deterministic selection, explicit sort preservation, effective-price bands, immutable reason facts, priority bounds, writer allow-list/code validation, malformed-output fallback behavior, and Stage-2 injected call counts. Existing A–E5 regression remains the compatibility gate.

## Readiness E7

E7 can audit/calibrate diversity utility and grounded prose quality without changing backend recommendation authority.
