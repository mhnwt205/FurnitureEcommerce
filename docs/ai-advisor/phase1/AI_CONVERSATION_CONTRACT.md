# Conversation contract (đề xuất)

## Request

```json
{
  "message": "Sofa nhỏ hơn và rẻ hơn mẫu này",
  "sessionId": "uuid-v4-client-generated",
  "context": { "currentProductId": 12 },
  "clientMessageId": "uuid-v4"
}
```

`message` bắt buộc, 1..1000 ký tự. `sessionId` là UUID ngẫu nhiên, không phải refresh token hay user ID. `clientMessageId` dùng idempotency/concurrency. Với authenticated request, backend bind session với user ID; guest bind với opaque browser session cookie hoặc signed session token, không tin session ID đơn lẻ.

## Response

### Clarification

```json
{
  "type": "clarification",
  "sessionId": "uuid-v4",
  "answer": "Mình có thể gợi ý ngay sau khi biết ngân sách.",
  "question": { "field": "budget.max", "text": "Ngân sách tối đa của bạn khoảng bao nhiêu?", "options": ["Dưới 10 triệu", "10–20 triệu", "Trên 20 triệu"] },
  "intent": { "intentType": "product_recommendation", "category": "sofa" },
  "recommendations": []
}
```

### Recommendation

```json
{
  "type": "recommendation",
  "sessionId": "uuid-v4",
  "answer": "Ba mẫu này phù hợp ngân sách và còn hàng.",
  "intent": { "intentType": "product_recommendation", "category": "sofa", "confidence": 0.88 },
  "recommendations": [{ "id": 12, "finalPrice": 12900000, "stock": 4, "reasonCodes": ["budget_match", "in_stock"] }],
  "canRefine": true
}
```

Recommendation DTO chỉ do backend tạo. Writer không thêm field fact; client render từ DTO.

### Fallback/error

Provider fail hoặc NLU JSON invalid nhưng regex fallback usable: trả `type: "recommendation"` hoặc `"clarification"`, kèm `meta: { "source": "fallback" }` chỉ cho observability nội bộ nếu cần. Lỗi không recoverable: HTTP 400 validation, 409 concurrent turn, 429 rate limit, 503 provider/catalog unavailable; không trả stack/API key.

## Lifecycle và merge

- Frontend sinh UUID lần đầu, lưu session opaque scoped origin; backend có thể rotate/return session ID.
- TTL đề xuất 24 giờ guest, 30 ngày authenticated (sliding TTL), tối đa 12 turns/24 giờ; reset tạo context rỗng và revoke snapshot cũ.
- Merge theo field: message mới explicit ghi đè field cũ; field vắng giữ lại; phủ định xoá field tương ứng; pending clarification chỉ nhận field nó hỏi trước khi diễn giải như request mới.
- `rẻ hơn` đặt `sortPreference=price_asc` và max/target dựa candidate/current product; `màu khác` thêm excluded current color; `loại nhỏ hơn` giảm size/dimension bound; chỉ áp dụng khi reference rõ, nếu không hỏi một clarification.
- Khóa optimistic bằng `version`/`clientMessageId`; request trùng trả response cached, request song song version cũ trả 409 hoặc serialize theo session.

## Ví dụ nhiều lượt

1. “Tôi cần sofa” → intent category sofa, có thể trả candidate + hỏi budget tinh chỉnh.
2. “Dưới 15 triệu” → merge `budget.max=15000000`, rank lại không hỏi category.
3. “Màu khác” → giữ category/budget, exclude màu recommendation trước; nếu không biết màu reference, hỏi một câu.
