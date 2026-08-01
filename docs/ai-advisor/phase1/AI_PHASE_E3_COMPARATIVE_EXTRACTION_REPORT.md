# AI Phase E3 — Comparative Reference Extraction

## Scope

E3 adds deterministic comparative/reference extraction and bounded internal session state. It does not alter candidate eligibility, ranking, recommendation ordering, API response shape, or make an additional database call.

## Comparative schema

`aiComparative.schema.js` defines strict closed enums for comparative type and reference source. A reference contains only bounded product IDs, normalized taxonomy values, optional VND price bounds and ordinal (1–5). Unknown keys, invalid IDs, invalid taxonomy values and inverted price bounds are rejected.

## Phrase recognition

`aiComparativeExtraction.service.js` recognizes only the tested Vietnamese phrases for cheaper/more expensive, different color/material/style/product, smaller/larger, similar, ordinal and stock-check intents. “Cao cấp hơn” is retained as an ambiguous `more_expensive` signal. Unrecognized wording produces `none`; no model selects a comparative type.

## Ordinal parsing and reference resolution

Ordinals resolve only against the bounded `lastRecommendationContext.productIds` list. Explicit ordinal takes priority; “mẫu này/sản phẩm này” may resolve the validated `currentProductId`; otherwise a previous recommendation context is used. The resolver never queries a product, never accepts an ID from raw user text, and never invents unavailable material/style/size/price facts.

## Session state and safety

`comparativeState` is initialized cleanly in `createSession`, updated on the working session copy and committed only with the existing generation-safe atomic session commit. It is replaced by a new comparative request, cleared by an explicit new category request and reset/rotation. A failed Stage 1 request or duplicate receipt cannot update it. The state holds no raw message or candidate artifact.

## Missing and ambiguous references

Unavailable ordinal, price, color, size or single-product references set `missingReference`; ambiguous phrasing is explicit. E3 stores these facts only. It does not create a budget, exclusions, a selected product, a clarification response or a comparative filter; those are E4/E5 responsibilities.

## Security and compatibility

Gemini is not called for comparative extraction or resolution. Product IDs are limited to known context IDs; no full DTO, PII or raw phrase is persisted/exposed. Comparative state is not passed into Stage 1 or Stage 2, so retrieval/query counts, eligibility, ranking, writer allow-list and public response remain unchanged.

## Tests

New tests cover phrase extraction, bounded ordinal resolution, strict schema rejection, reference completeness, input immutability, copy-on-write rollback, duplicate concurrency and reset behavior. Existing AI pipeline tests remain the regression authority.

## Remaining limitations / readiness E4

Comparative state is foundation-only: material/style and size require fields not always present in `lastRecommendationContext`; stock checks do not query stock directly; and comparative conditions do not yet affect hard filtering or scoring. E4 can consume the strict state to implement bounded comparative eligibility/scoring without changing extraction or session authority.
