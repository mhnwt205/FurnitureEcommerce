# Phase A — Characterization and Regression Protection

## Branch và base

- Branch: `codex/ai-phase-a-characterization`.
- Base branch: `origin/main`.
- Base commit tại lúc bắt đầu: `de3378d`.
- Scope: characterization/regression tests và hai test seams thuần; không có structured intent, session, clarification, ranking mới, schema hay dependency.

## Test harness

Backend chạy Node built-in test qua `npm.cmd test` → `node tests/run-tests.js` (`backend/package.json:8`, `backend/tests/run-tests.js:1-33`). Full suite chỉ chạy khi có `NODE_ENV=test` và isolated `TEST_DATABASE_URL`; runner từ chối thiếu URL trước khi spawn tests. Prisma/Azure production không được dùng.

Frontend có Vitest node-only (`frontend/package.json:8-9`, `frontend/vitest.config.js:1-7`) nhưng không có React DOM/component-test dependency. Vì không thêm framework ở Phase A, frontend được kiểm bằng existing Vitest suite và production build; UI AI không bị sửa.

## Production-code seam

Không thay request path, response contract, parser, ranking hay provider behavior. Hai export-only seams:

- `chatSchema` được export tại `backend/controllers/aiAdvisor.controller.js:4` để characterization input contract.
- `aiAdvisorCharacterization` export các helper pure đang được `getAdvisorResponse` dùng tại `backend/services/aiAdvisor.service.js` cuối file.

Các export không được gọi bởi request path và không thay đổi giá trị trả về. Không thêm dependency/mock production DB.

## Behavior đã khóa

- Body `message` trim 1..1000, `context.currentProductId` positive integer coercion; contract controller vẫn chỉ trả `answer` và `recommendations` (`backend/controllers/aiAdvisor.controller.js:4-14`).
- Public AI limiter giữ ngưỡng 10/15 phút; existing test đồng thời bảo vệ consultation/upload limiter (`backend/tests/h1.rate-limit.test.js:20-101`).
- Category aliases: sofa, bàn, ghế, giường, tủ, đèn; normalization dấu/không dấu.
- Budget: `15 triệu`, `15tr`, VND số lớn, `5000k`, range, dưới/trên, ±20% around.
- Attribute vocabulary/dimensions, active/category-or-keyword Prisma where shape, pricing DTO, promotion calculation, score influences, budget matching, out-of-stock remains serializable, deterministic DTO facts.
- Gemini prompt candidate minimization, fenced JSON, allowed-ID reason map, malformed/invalid answer/no-key behavior; existing resilience tests lock retry 503, non-retry 400 và timeout retry.

## Vietnamese supported và known limitations

Supported fixtures: “Tôi cần sofa dưới 15 triệu”, “Tìm bàn khoảng 10-20 triệu”, “Ghế phòng khách màu kem”, “Giường gỗ phong cách hiện đại”, “Tủ dưới 5000k”.

Characterized limitations, **không sửa**:

- `15 củ`, `một triệu rưỡi`, số bằng chữ không yield budget.
- “Loại rẻ hơn”/“Màu khác” không có category/context merge: current service stateless ngoài `currentProductId` request-local.
- Matching là `includes`: “Đèn bàn” có thể match `ban` trước `den`; material extraction có thể thêm `da`/`ni` từ substring trong sentence. Tests khóa đúng behavior này để Phase B sửa có chủ đích.
- Stock là ranking score, chưa là hard filter.

## Lệnh và kết quả

| Lệnh | Kết quả |
|---|---|
| `node --test tests/h3.ai-characterization.test.js tests/h3.ai-resilience.test.js tests/h1.rate-limit.test.js` | Pass 20/20; mock fetch, không network/DB |
| `npm.cmd test` (backend) | Blocked: `TEST_DATABASE_URL is required and must not be empty` |
| Nhóm non-DB health/error/env/rate/CSP/metrics/VNPay/permission/AI | 62/64 pass; 2 pre-existing env fixture failures ở `h1.env-request-context.test.js` do thiếu `RESEND_API_KEY`, `EMAIL_FROM` mà validator production yêu cầu |
| `npx.cmd prisma validate` | Pass |
| `npm.cmd run test:run` (frontend) | Pass 14/14 |
| `npm.cmd run build` (frontend) | Pass |

`npm.cmd test` không được bypass bằng `.env` production và không có Azure SQL access/use trong Phase A. Các test DB-dependent (orders/support/dashboard) bị skipped theo môi trường, không disabled trong source.

## Regression impact và done criteria

Không thay behavior production có chủ đích. Contract/parser/provider boundary và limiter hiện đã có test deterministic. Full DB suite còn cần isolated `TEST_DATABASE_URL`; environment regressions ngoài AI cần owner của env fixture xử lý. Không có test frontend component AI vì harness hiện không cung cấp renderer/DOM tooling và Phase A không thêm dependency.

Phase A đủ điều kiện chuyển **thiết kế/triển khai Phase B có kiểm soát**, với điều kiện giữ test characterization này và chấp nhận các limitation là baseline chứ không phải requirement tương lai. Trước Phase B nên xác nhận taxonomy canonical và expected handling cho `củ`, `triệu rưỡi`, typo/substrings, negation và follow-up.
