# Recommendation policy (đề xuất)

## Backend authority

Product IDs, price/final price, stock, promotion, availability, filter, score và top-N luôn được server tạo. Điều này kế thừa control hiện có: Gemini chỉ nhận `allowedProducts`, còn ID lạ bị loại (`backend/services/aiAdvisor.service.js:550-651`).

## Pipeline

1. Load active products theo category/keyword có index.
2. Enrich qua pricing service; aggregate approved review; lấy image/category.
3. Hard filter: `isActive`, category explicit, stock khi `stockRequired`, budget explicit, dimension hard, negation explicit.
4. Soft score: room/style/color/material exact > synonym/text; price proximity; rating với confidence/review count; current-product similarity; stock margin.
5. Diversify (không quá 2 product một subcategory/style/price band), tie-break deterministic ID.
6. Top N do backend cấu hình (đề xuất 3 mặc định, tối đa 5), attach reason codes và fact snapshot.
7. Gemini chỉ diễn đạt reason codes/facts cho N product đó.

Current implementation lấy max 50, enrich promotion/review, score in-memory và top 5 (`backend/services/aiAdvisor.service.js:5-6,292-306,666-779`). Trong target, stock là hard filter khi user cần mua ngay; current state chỉ cộng 30 điểm stock nên vẫn có thể recommend out-of-stock (`:429-433`).

## Scoring đề xuất

Điểm 100: category 25, hard attribute exact 25, budget proximity 15, room/use case 10, stock 10, quality (Bayesian review) 8, current-product relation 4, promotion preference 3. Không score nếu vi phạm hard filter. Thiếu data là neutral, không giả định match. Trả `reasonCodes`, ví dụ `category_match`, `within_budget`, `in_stock`, `room_match`; writer không tạo reason mới.

## Promotion, reviews và no-result

Giá canonical là `finalPrice` từ pricing service; original/discount chỉ display từ backend. Review chỉ approved như query hiện có (`backend/services/aiAdvisor.service.js:292-306`). Khi no-result, thử relaxation theo thứ tự soft color/material/style → budget tolerance **sau khi xin phép**; không relax explicit category/stock/negation. Nếu vẫn rỗng, `recommendations: []`, lời rõ ràng và một refinement question.
