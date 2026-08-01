# Audit kiến trúc AI Advisor hiện tại

## Phạm vi và trạng thái

Tài liệu này mô tả **current state đã kiểm chứng từ mã nguồn** tại thời điểm audit. Không có thay đổi production code, schema hoặc dependency trong phase này.

## Endpoint và contract

| Mục | Hiện trạng | Bằng chứng |
|---|---|---|
| URL/method | `POST /api/ai-advisor/chat` | `backend/app.js:80`, `backend/routes/aiAdvisor.routes.js:6` |
| Middleware | Chỉ có `aiAdvisorRateLimiter`; không có auth middleware trên route này | `backend/routes/aiAdvisor.routes.js:2,6` |
| Public/auth | Public, khóa rate-limit theo IP | `backend/middlewares/publicRateLimit.middleware.js:21-22` |
| Rate limit | Mặc định 10 request / 15 phút; override bởi `AI_ADVISOR_RATE_LIMIT_MAX`, `AI_ADVISOR_RATE_LIMIT_WINDOW_MS` | `backend/middlewares/publicRateLimit.middleware.js:4-22`, `backend/.env.example:57-59` |
| Request | `{ message: string 1..1000, context?: { currentProductId?: positive integer } }` | `backend/controllers/aiAdvisor.controller.js:4-7` |
| Response | HTTP 200 `{ answer, recommendations }`; `mode` của service không được trả ra | `backend/controllers/aiAdvisor.controller.js:11-14`, `backend/services/aiAdvisor.service.js:786` |
| Lỗi input | 400 `{ message, errors }`; lỗi khác 500 | `backend/controllers/aiAdvisor.controller.js:15-21` |

## Luồng xử lý hiện tại

1. Controller validate body bằng Zod và gọi `getAdvisorResponse({ message, context })`. `backend/controllers/aiAdvisor.controller.js:4-14`.
2. Service chạy parser rule-based: `extractBudget`, `extractCategorySlug`, `extractAttributeIntent`, keyword extraction. Gemini **không** chạy trước parser. `backend/services/aiAdvisor.service.js:687-692`.
3. `buildProductWhere` chỉ đưa `isActive`, category nếu tìm được và OR keyword vào Prisma; price/attribute không phải hard filter DB. `backend/services/aiAdvisor.service.js:266-284`.
4. Service lấy tối đa 50 sản phẩm, category/images, DB sort stock/price/createdAt; sau đó aggregate review approved và enrich giá bằng `attachPricingToProducts`. `backend/services/aiAdvisor.service.js:292-306,666-685,734-741`.
5. Budget, attribute và ranking còn lại chạy in-memory. Score gồm stock, category, budget, current-product category, keywords, attribute, từ khóa rẻ/tiết kiệm và review count. `backend/services/aiAdvisor.service.js:343-397,422-449,743-772`.
6. Backend cắt tối đa 5 product, serialize giá/tồn/category/review/reason, rồi mới gọi Gemini. `backend/services/aiAdvisor.service.js:5,452-486,768-779`.
7. Gemini chỉ có thể thay `answer` và `reason` cho ID thuộc set recommendation; lỗi Gemini rơi về lời rule-based. `backend/services/aiAdvisor.service.js:592-665,779-786`.

## NLU hiện tại

`normalizeText` bỏ dấu, lowercase và chuẩn hóa ký tự (`backend/services/aiAdvisor.service.js:76-83`). Taxonomy đóng cứng gồm 6 category alias, color/material/room/style và size words (`:9-25`). Budget nhận range, trên/dưới, khoảng/tầm, số triệu/tr/nghìn/k và VND số lớn (`:102-181`). Kích thước nhận `x`, mét, cm (`:195-248`).

Không có confidence, intent type chuẩn, schema intent hay validation output NLU. Không thấy xử lý có bằng chứng cho typo gần đúng, số bằng chữ, “triệu rưỡi”, “củ”, phủ định, so sánh ngữ cảnh, nhiều lượt hoặc câu tham chiếu “rẻ hơn/màu khác/loại nhỏ hơn”. Parser chỉ nhận message hiện tại; `currentProductId` chỉ bổ sung điểm category (`:429-449,696-705`).

## Retrieval, authority và fallback

- Backend chọn product ID và serialize giá/tồn kho từ DB; Gemini nhận `allowedProducts` giới hạn và ID ngoài danh sách bị loại khỏi `reasonMap`. `backend/services/aiAdvisor.service.js:550-580,647-651`.
- `isActive: true` là filter DB mặc định; out-of-stock **không bị loại**, chỉ được điểm thấp hơn. `backend/services/aiAdvisor.service.js:266-284,429-433`.
- Promotion/final price lấy từ `promotionPricing.service.js` qua `attachPricingToProducts`, không lấy từ Gemini. `backend/services/aiAdvisor.service.js:3,734-741`.
- Khi query rỗng, service nới keyword/budget/attribute theo từng nhánh; khi không còn candidate trả rule-based no-result. `backend/services/aiAdvisor.service.js:707-732,768-779`.

## Provider resilience và observability

Model là `AI_MODEL` hoặc `gemini-flash-latest`; key chỉ đọc server-side từ `GEMINI_API_KEY` (`backend/services/aiAdvisor.service.js:7,619-632`; `backend/.env.example:54-55`). Call dùng timeout 8 giây, tối đa 2 lần, retry 408/429/5xx/timeout sau 200 ms, strip fenced JSON và kiểm tra `answer` string (`:583-665`). Không dùng Zod cho output Gemini.

Logger ghi retry/failure/latency provider nhưng logger whitelist không cho message, catalog hoặc API key (`backend/services/aiAdvisor.service.js:637-659`, `backend/utils/logger.js:1-27`). Metrics hiện chỉ aggregate HTTP method/path/status/duration; chưa có metric intent, fallback, candidate/no-result, session hoặc click (`backend/utils/metrics.js:1-13`). Request ID có ở rate-limit log nhưng không được truyền vào service/provider (`backend/middlewares/publicRateLimit.middleware.js:15-17`).

## Frontend và conversation

`AISalesAdvisor` giữ messages chỉ trong React state, thêm local welcome, gửi `{message, context.currentProductId}` và render response. `frontend/src/components/ai/AISalesAdvisor.jsx:62-105`. Không có `sessionId`, localStorage, history gửi backend, reset command, TTL hay xử lý concurrent request ngoài việc khóa UI khi `loading` (`:69-99,160-187`). Current product ID được suy từ `/products/:id` (`:10-13,78`).

## Database và tests

Schema có Product attributes, Category, Promotion relations và Review approved phù hợp retrieval (`backend/prisma/schema.prisma:104-147,277-299,435-480`). Không có model AI advisor session/message/analytics; `Conversation`/`ConversationMessage` hiện thuộc support conversation và gắn sender user bắt buộc, không phải bằng chứng tái dùng an toàn cho guest AI (`backend/prisma/schema.prisma:397-431`).

Test hiện có chỉ kiểm retry transient, malformed provider response và timeout, qua mock fetch (`backend/tests/h3.ai-resilience.test.js:1-39`). Chưa có test parser tiếng Việt, query/ranking, stock, promotion, session, clarification, injection hay evaluation dataset.

## Điểm mạnh và technical debt

Điểm mạnh: backend đã là authority của catalogue; provider có timeout/retry/fallback; input có giới hạn 1000 ký tự và route rate-limit. Technical debt chính: one-turn stateless, taxonomy/regex hẹp, no clarification, stock không là hard constraint, DB filter còn rộng, Gemini output không schema-validate, và thiếu telemetry/evaluation end-to-end.
