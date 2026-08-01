# Phase H — Frontend Multi-turn, Clarification and Relaxation UX

## Existing frontend audit

The advisor was a floating component (`AISalesAdvisor.jsx`) with component-only history and an API call sending only `{ message, context }`. It already derived numeric `currentProductId` from `/products/:id`, used Enter/Shift+Enter correctly, rendered backend card order, and had a loading state. It had no session persistence, retry identity, response-type model, option controls, reset or stale-response protection.

## Implementation

The frontend now has a small pure advisor feature boundary:

- `aiAdvisorState.js`: bounded reducer, request generation, stale-response rejection and client-message IDs.
- `aiAdvisorNormalizer.js`: additive backend response compatibility and user-safe error messages.
- `aiAdvisorStorage.js`: best-effort browser persistence under `ai-advisor-session-v1`.
- `aiAdvisorService.js`: payload builder plus `chatWithAdvisor(payload, { signal })`.

Only `sessionId`, expiration and at most 20 bounded UI messages are persisted. No token, backend session state, telemetry, raw provider output or internal candidate information is stored. UI history can contain user text, so the reset control clears it and persistence is intentionally bounded to 24 hours/the backend expiry.

## UX and safety

Recommendation, clarification, relaxation proposal and terminal no-result responses are normalized. Clarification options send their label; relaxation choices send a deterministic ordinal and include a reject button. Controls are consumed after selection and a local pending guard prevents double click/Enter races. Retry keeps the same `clientMessageId` and does not add a second user bubble. Reset uses the existing additive `resetSession` contract and preserves local state if that request fails. Abort on unmount and generation checks discard stale UI responses.

Cards retain backend price, promotion, stock, order, reason and product link without recalculation or filtering. The current product context is sent only while the product-detail route is active.

## Tests and manual UX matrix

Pure Vitest coverage locks request payload compatibility, normalizer fallback, option/terminal shapes, error mapping, stale-response rejection, retry identity, reset, bounded persistence and expiry. Manual verification should cover: normal recommendation; category/budget clarification; exclusion and stock no-result; missing comparative reference; one/multiple relaxation options and reject; terminal no-result; reset; reload; rate limit; network retry; and product-detail context.

## Limitations

There is no React-DOM interaction library in this repository, so interaction behavior is protected through the reducer/controller tests and production build rather than DOM simulation. Session/history persistence is browser-local best effort; a missing/expired backend session may rotate normally on the next response. No automatic commerce action is introduced.
