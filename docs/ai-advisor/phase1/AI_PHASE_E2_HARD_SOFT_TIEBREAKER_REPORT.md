# Phase E2 — Hard/Soft Constraint Classification and Deterministic Tie-breaker

## Scope

E2 adds an internal strict classifier, routes only required attributes into Stage-1 eligibility, retains ordinary preferences for Stage-2 scoring, and makes ranking order deterministic. It does not add comparative behavior, relaxation, diversification, frontend work, database changes, or Gemini authority.

## Classification contract

`aiConstraintClassification.service.js` accepts canonical `intent`, bounded `fieldMeta`, operation strengths, and canonical exclusions. It returns a strict three-way contract:

- `hard`: category, explicit budget, `stockRequired`, required attributes, and exclusions.
- `soft`: ordinary colors/materials/room/style/size, sort preference, price preference placeholder, and current-product similarity.
- `contextOnly`: intent type, confidence, missing/ambiguous fields, and bounded constraints.

The only internal strength values are `required`, `preferred`, and `unspecified`. Unknown taxonomy values are dropped before output. Category and any budget range are always hard; `stockRequired: true` and exclusions are always hard.

## Required/preferred semantics

Plain extracted preferences such as “sofa màu xanh” and “ưu tiên gỗ” remain preferred. The minimal explicit-language adapter recognizes `chỉ`, `bắt buộc`, `nhất định`, and `phải`; when these occur with recognized canonical preference values, merge stores `fieldMeta.<field>.strength = required`. Clear removes that metadata; omitted fields retain existing metadata through the copy-on-write merge path.

No raw phrase is persisted. A weak Gemini inference without a required strength cannot turn an attribute into a hard filter.

## Stage 1 hard eligibility

Stage 1 creates a classification after resolving intent and before retrieval/eligibility. It passes only the classification’s required attribute subset to eligibility, while preserving E1 filter order: budget, required attributes, exclusions, stock requirement. Soft attributes do not reduce diagnostics or produce `no_attribute_match`.

Candidate Summary now receives the internal classification. `attributeMatched` is null for soft-only preferences; `no_attribute_match` is available only when required attributes emptied the candidate set. Exclusion/stock summary semantics remain unchanged.

## Stage 2 soft scoring

The existing attribute score is retained as the soft preference bonus: exact color/material matches receive the existing higher values, text matches receive lower values, room/style/size/dimensions retain their existing bonus rules. A non-match earns zero and is still eligible. Hard attributes already survived Stage 1 and are not used to reject a candidate again based on all soft preferences.

Default in-stock bonus remains +30 where `stockRequired` is not hard; explicit stock-required candidates have already been filtered. No ranking weights were otherwise changed.

## Deterministic comparator and sort preferences

The default relevance comparator is:

1. score descending;
2. in-stock first;
3. effective price ascending;
4. rating descending;
5. review count descending;
6. product ID ascending.

Taxonomy preferences are deterministic too:

- `price_asc`: effective price, score, stock, rating, review count, ID.
- `price_desc`: effective price descending, score, stock, rating, review count, ID.
- `rating_desc`: rating, score, stock, effective price, review count, ID.
- `newest`: creation time, score, stock, effective price, rating, review count, ID.

Effective/final price is always used in price ordering. The product ID is the final stable tie-breaker, independent of Prisma return order.

## Session safety

Constraint strength is bounded metadata on the existing working session. It participates in the existing clone/commit lifecycle, so Stage-1 failure, stale generation, duplicate idempotency, reset, TTL, and rotation retain their D4.6 behavior. No artifacts or raw phrases are stored.

## Tests

New tests cover classifier strictness, required/preferred cases, unknown taxonomy, clear behavior, actual Stage-1 strength integration, soft-vs-hard eligibility, deterministic comparator input-order independence, ID/stock/price/rating ties, sort preferences, and effective promotion price sorting. Existing E1, Summary, clarification, transaction, and direct Stage DI call-count tests continue to pass.

## Remaining limitations and readiness E3

The classifier recognizes only the agreed minimal strong-language patterns and does not interpret comparative references. Category/style exclusion recognition is not expanded here; existing canonical session exclusions remain hard. Relaxation, diversification, factual writer grounding, and comparative reference extraction remain later Phase E work.

**Ready for E3**: Stage 1 now has a clear hard-constraint boundary and Stage 2 has deterministic, preference-aware ordering.
