# Reference Project Risk Report

## Confirmed risks in the reference project

| Severity | Risk | Impact on adoption decision | Evidence |
|---|---|---|---|
| Critical for commerce adoption | LLM is asked to choose and return full source records. | Never use for Furniture product selection. | `D:\phongtro123\server\src\utils\AISearch\AISearch.js:46-65` |
| High | Full serialized records can include contact/user identity fields. | Do not copy catalog injection design. | `AISearch.js:43-54`; `post.model.js:23-43` |
| High | No AI request validation, authentication, rate limiting, timeout or output schema. | No direct API/utility adoption. | `server.js:48-58`; AI utilities |
| Medium | Raw questions/errors are logged and failures collapse to empty data. | Do not copy logging/fallback behavior. | `server.js:56`; `AISearch.js:66-68` |
| Medium | No AI tests or evaluation set. | Reference cannot establish behavioral equivalence. | `server/package.json:6-9` |
| Low | Gemini client/model configuration duplicated. | Only the desire for central configuration is transferable. | `chatbot.js:1-6`; `AISearch.js:1-5` |

## Missing information

No AI-specific test, schema, tool, vector/RAG, state-machine or provider abstraction source was found. This audit makes no inference about deployment topology, production Mongo data, actual `.env` values, provider quota, runtime logs or dependency health because none were executed/read.

## FurnitureEcommerce protections to preserve

Do not weaken backend authority, strict validation, copy-on-write commit, bounded state, idempotency, Stage 1/Stage 2 call-count guarantees, no-result semantics or deterministic ranking to emulate the shorter reference implementation.

## Verdict

The reference is suitable only as a visual/UX prototype and a negative security/authority comparison. It is not a safe backend AI architecture to copy.
