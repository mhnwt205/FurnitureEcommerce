# Reference AI Project Audit — phongtro123

## Audit scope and confirmed stack

- Reference project confirmed at `D:\phongtro123`; its AI source is present in `server/src/utils/Chatbot/chatbot.js` and `server/src/utils/AISearch/AISearch.js`.
- Frontend: React 18 + Vite + Axios + Ant Design ([`client/package.json`](../../../phongtro123/client/package.json:1)).
- Backend: CommonJS Express 5 + Mongoose/MongoDB + Socket.IO ([`server/package.json`](../../../phongtro123/server/package.json:13), [`ConnectDB.js`](../../../phongtro123/server/src/config/ConnectDB.js:4)).
- Provider/model: `@google/generative-ai`, direct Gemini `gemini-1.5-flash` client ([`chatbot.js`](../../../phongtro123/server/src/utils/Chatbot/chatbot.js:1), [`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:1)).
- Package manager: npm; lockfiles exist. No install, model call, database connection, migration or seed was run. `.env` files exist but were not opened; only variable names referenced by source were inventoried.

## AI architecture inventory

| Area | Evidence | Finding |
|---|---|---|
| Routes/controllers | [`server.js`](../../../phongtro123/server/src/server.js:48) | `/chat` and `/ai-search` are inline Express handlers, not controllers or routed modules. |
| Provider adapter | [`chatbot.js`](../../../phongtro123/server/src/utils/Chatbot/chatbot.js:1) | Two direct provider instantiations; no interface/adapter. |
| Prompt builders | [`chatbot.js`](../../../phongtro123/server/src/utils/Chatbot/chatbot.js:14), [`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:11) | Inline template literals. |
| Validators/schemas | search of server source | None for AI request or model output. |
| Retrieval/RAG/vector | [`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:43) | Mongo `find({}).limit(20)` only; no embeddings/vector store/RAG. |
| Ranking/recommendation | [`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:46) | Model selects/ranks arbitrary post objects; no backend ranker. |
| Session/memory | frontend and server AI files | None. Chat history is component-local only. |
| Tool/agent/workflow | package/source inventory | None. Exactly one model call per AI endpoint request. |
| Rate limit/telemetry | server AI files | None; `console.log/error` only. |
| Tests | [`server/package.json`](../../../phongtro123/server/package.json:6) | Server test script is a placeholder; no AI tests found. |

## Actual request flows

### Chatbot

1. React local state appends the message and sends `POST /chat` with `{ question }` ([`Chatbot.jsx`](../../../phongtro123/client/src/utils/Chatbot/Chatbot.jsx:24), [`request.jsx`](../../../phongtro123/client/src/config/request.jsx:35)).
2. The inline server handler reads `req.body.question` without validation and calls `askQuestion` ([`server.js`](../../../phongtro123/server/src/server.js:48)).
3. `askQuestion` reads **all** posts, derives title/price strings, interpolates them and the raw user question into one prompt, then makes one Gemini call ([`chatbot.js`](../../../phongtro123/server/src/utils/Chatbot/chatbot.js:9)).
4. The model response is free text and is returned unvalidated to the browser; provider/database failure is logged and produces `undefined` ([`chatbot.js`](../../../phongtro123/server/src/utils/Chatbot/chatbot.js:23)).

Trust boundary: the model controls the text rendered to the user; it does not receive a structured allow-list result contract. Side effect: one unbounded Mongo query and one external provider call.

### AI search

1. The page reads the route parameter and requests `GET /ai-search?question=…` ([`AISearch.jsx`](../../../phongtro123/client/src/Pages/AISearch/AISearch.jsx:23), [`request.jsx`](../../../phongtro123/client/src/config/request.jsx:45)).
2. The inline handler logs the raw question, calls `AiSearch`, and returns its result with HTTP 200 ([`server.js`](../../../phongtro123/server/src/server.js:54)).
3. `AiSearch` reads up to 20 arbitrary posts, serializes full Mongo objects into the prompt, asks Gemini to select full originals, strips code fences, parses JSON and returns it ([`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:40)).
4. On Mongo/provider/parser failure, it logs an error and returns `[]`; the frontend renders returned values as product/post fields ([`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:64), [`AISearch.jsx`](../../../phongtro123/client/src/Pages/AISearch/AISearch.jsx:66)).

Trust boundary: the model can invent, omit, mutate, or reorder post DTOs. There is no output validation, re-fetch by ID, authorization, stock/status revalidation or deterministic ranking.

## Prompt and model audit

The project uses simple domain instructions plus raw user input. `AiSearchKeyword` asks for JSON but only calls `JSON.parse`; it does not validate shape/content ([`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:9)). `AiSearch` sends complete JSON post objects, including fields defined as phone, username and user ID in the post model ([`post.model.js`](../../../phongtro123/server/src/models/post.model.js:23)), then asks the model to return full originals.

There is no system/developer separation, history injection, token bound, temperature setting, timeout, retry, provider fallback, anti-injection instruction, strict schema, tool allow-list or grounding verification. The only weak format mitigation is stripping Markdown fences before parsing ([`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:29)).

## Session, memory and frontend UX

Chat history is React `useState`, lost on refresh/close and not sent to backend ([`Chatbot.jsx`](../../../phongtro123/client/src/utils/Chatbot/Chatbot.jsx:8)). There is loading state, an error message, auto-scroll and a text-only conversation, but no session ID, persistence, reset endpoint, clarification UX, option buttons, streaming, cancellation or product action cards. AI search has a loading spinner and direct result cards, but no result provenance or error state.

## Resilience, security and privacy findings

| Severity | Finding | Evidence |
|---|---|---|
| **High** | Model controls returned post objects; no ID allow-list/DTO rebuild/revalidation. | [`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:54) |
| **High** | Full post JSON—including user-facing contact/identity fields in the model—can be sent to Gemini. | [`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:43), [`post.model.js`](../../../phongtro123/server/src/models/post.model.js:23) |
| **High** | AI endpoints lack visible request validation, auth, rate limit and timeout/retry controls. | [`server.js`](../../../phongtro123/server/src/server.js:48), AI utilities |
| **Medium** | Raw user question is logged; provider/database/parser errors are logged directly. | [`server.js`](../../../phongtro123/server/src/server.js:56), [`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:66) |
| **Medium** | Failure becomes `[]`/`undefined`, masking retrieval/provider distinction while still returning 200. | [`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:66) |
| **Low** | Provider configuration is duplicated in two modules. | [`chatbot.js`](../../../phongtro123/server/src/utils/Chatbot/chatbot.js:5), [`AISearch.js`](../../../phongtro123/server/src/utils/AISearch/AISearch.js:4) |

## Conclusion

The reference is a useful UI prototype but not a safe recommendation architecture. It is prompt-driven retrieval/selection, not RAG, agent tooling, workflow graph or a deterministic rule engine. Its main transferable idea is small, isolated UI request functions; its authority and state patterns must not be adopted directly.
