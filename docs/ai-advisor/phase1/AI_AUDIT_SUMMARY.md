# AI Advisor audit summary

## Kết luận

AI Advisor hiện có nền tảng recommendation backend-first tương đối tốt: active product query, pricing enrichment, approved-review aggregate, deterministic score/top 5, Gemini timeout/retry và rule-based fallback. Endpoint là public, stateless, single-turn và chỉ trả `answer/recommendations`. Bằng chứng đầy đủ tại [AI_CURRENT_ARCHITECTURE_AUDIT.md](AI_CURRENT_ARCHITECTURE_AUDIT.md).

## Main gaps

- Chưa có structured intent/confidence/schema validation.
- Không có session, history, merge, reset, TTL hay concurrent-turn handling.
- Không có clarification manager.
- Stock không là hard filter; query attributes/budget chủ yếu in-memory.
- Gemini output parse thủ công, không Zod strict.
- Thiếu test Vietnamese, ranking/catalog validity, session/security và telemetry/evaluation.

## Target state

Orchestrator merge session + validated intent; clarification chỉ khi cần; deterministic backend engine trả fact snapshot/reason codes; Gemini chỉ extraction/writing trong boundary. Xem [AI_TARGET_ARCHITECTURE.md](AI_TARGET_ARCHITECTURE.md), [AI_CONVERSATION_CONTRACT.md](AI_CONVERSATION_CONTRACT.md), [AI_RECOMMENDATION_POLICY.md](AI_RECOMMENDATION_POLICY.md).

## First recommended implementation phase

Chọn **Phase A — Characterization and regression protection**: fixture catalog và test hiện trạng trước khi đổi parser/contract. Sau đó cần quyết định session store tại [AI_SESSION_STORAGE_DECISION.md](AI_SESSION_STORAGE_DECISION.md), rồi mới bắt đầu B/C.

## Quyết định cần xác nhận

1. Có bắt buộc chỉ recommend còn hàng không, hay được phép hiện “hết hàng” như widget hiện tại?
2. Guest history cần tồn tại bao lâu; authenticated history có cần được hiển thị/xóa cho user không?
3. “Doanh thu”/promotion facts cần snapshot tại thời điểm chat hay live rehydrate mỗi response?
4. Có chấp nhận Redis khi scale hay chỉ database/in-memory cho đồ án?
5. Threshold candidate/clarification và top-N UX mong muốn là bao nhiêu?
6. Có consent/retention requirement nào cho raw chat analytics không?
