# Structured Intent Schema (đề xuất)

## Schema canonical

```json
{
  "intentType": "product_recommendation",
  "category": "sofa",
  "budget": { "min": null, "max": 15000000, "currency": "VND" },
  "room": "living_room",
  "style": "modern",
  "colors": ["cream"],
  "materials": [],
  "size": "small",
  "dimensionsCm": { "width": null, "height": null, "depth": null },
  "stockRequired": true,
  "sortPreference": null,
  "constraints": [],
  "negated": { "colors": [], "materials": [] },
  "confidence": 0.82,
  "missingImportantFields": [],
  "ambiguousFields": []
}
```

`intentType`, `confidence`, `missingImportantFields`, `ambiguousFields` bắt buộc trong NLU output. Category là bắt buộc **chỉ** trước retrieval product recommendation; budget/room/style/color/material/size là optional. `stockRequired` mặc định true cho recommendation; lời hỏi thông tin sản phẩm có thể không dùng engine recommendation.

## Taxonomy đóng

Enum lấy từ catalog mapping do backend quản trị: category slug hiện có bắt đầu từ `sofa`, `ban`, `ghe`, `giuong`, `tu`, `den` (`backend/services/aiAdvisor.service.js:9-16`); room `living_room|bedroom|home_office|office|kitchen|balcony`; style `modern|minimalist|classic|luxury|vintage|scandinavian`; colors/materials phải map vào vocabulary backend. Model chỉ chọn enum supplied, `z.enum(...)` reject giá trị lạ. Không biến raw Vietnamese thành taxonomy mới.

## Normalization và Zod proposal

Normalize Unicode NFD, bỏ dấu, lowercase, trim trước mapping, kế thừa nguyên tắc `normalizeText` hiện có (`backend/services/aiAdvisor.service.js:76-83`). Tách raw spans để audit nội bộ, nhưng không log raw message mặc định. Zod đề xuất: strict object, `budget` nonnegative and min≤max, dimensions positive/max reasonable, arrays dedupe/max 5, confidence `0..1`, enum only; reject extra fields. Sau Zod, catalog resolver xác nhận category/taxonomy còn tồn tại.

Budget parser fallback phải hỗ trợ `15 triệu`, `15tr`, `15 củ`, `triệu rưỡi`, range, dưới/trên/tầm; regex hiện chưa có bằng chứng hỗ trợ “củ” hay “triệu rưỡi” (`backend/services/aiAdvisor.service.js:102-181`). Nếu Gemini JSON malformed: strip fence, parse strict, nếu fail chạy deterministic parser hiện hữu, gán confidence thấp và chỉ hỏi clarification khi cần; không tự đoán category.

## Ví dụ

Hợp lệ: `{ "intentType":"product_recommendation", "category":"sofa", "budget":{"min":null,"max":15000000,"currency":"VND"}, "room":null, "style":null, "colors":[], "materials":[], "size":null, "dimensionsCm":{"width":null,"height":null,"depth":null}, "stockRequired":true, "sortPreference":null, "constraints":[], "negated":{"colors":[],"materials":[]}, "confidence":0.9, "missingImportantFields":[], "ambiguousFields":[] }`.

Không hợp lệ: category `"sofa-ngoai-he-thong"`, `max < min`, confidence `1.4`, `productId` trong intent, hoặc extra action `addToCart`; backend reject và dùng fallback/clarification.
