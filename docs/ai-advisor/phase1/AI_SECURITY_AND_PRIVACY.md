# Security and privacy (đề xuất)

## Current controls và gap

Input hiện max 1000 ký tự, Zod controller (`backend/controllers/aiAdvisor.controller.js:4-7`), public IP rate-limit (`backend/middlewares/publicRateLimit.middleware.js:9-22`), prompt instruct Gemini chỉ dùng allowed products (`backend/services/aiAdvisor.service.js:592-613`), và logger allowlist không log message/key (`backend/utils/logger.js:1-27`). Gap: prompt là instruction-only boundary; output JSON không Zod; không có session ownership/TTL/analytics privacy policy.

## Controls bắt buộc target

- Treat mọi model output là untrusted: Zod strict, ID subset backend, rehydrate facts from DB DTO; never execute action/tool call.
- Prompt injection: user message là data, không quyền override system contract; tách input structured, cap length, reject instruction-like fields trong JSON.
- Data minimization: chỉ gửi top candidates cần wording, không toàn catalog, customer PII, admin note, order/cart/wishlist data.
- Session security: opaque random ID, authenticated binding; guest signed cookie/token; rotation/reset, TTL, version/idempotency; tránh enumeration/hijacking.
- Abuse: rate-limit theo IP hiện có, thêm per-session/user budget, provider circuit breaker, request-size/turn cap.
- Output rendering: React text render hiện không dùng `dangerouslySetInnerHTML` trong widget (`frontend/src/components/ai/AISalesAdvisor.jsx:119-136`); giữ nguyên nguyên tắc text-only/sanitize URLs server-side.
- Secrets: `GEMINI_API_KEY` chỉ backend env (`backend/.env.example:54`), không echo request URL hay config to client/log.
- Logging: hash/correlation ID, provider outcome/latency/count; không raw message, session token, PII hay full prompt/candidate unless explicit redacted debug policy.

Failure mode an toàn: provider fail → deterministic answer/clarification; catalog fail → 503 generic; never fallback sang fabricated product.
