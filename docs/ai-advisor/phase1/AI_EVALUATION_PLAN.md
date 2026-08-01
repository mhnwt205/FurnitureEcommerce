# Evaluation plan (đề xuất)

## Dataset

JSONL versioned: `{id, turns, catalogFixture, expectedIntent, expectedClarification, expectedAllowedIds, safetyAssertions}`. Không chứa PII/production conversation. Cases tối thiểu:

- Giá: `15 triệu`, `15tr`, `15 củ`, `triệu rưỡi`, `từ 10 đến 20 triệu`, `dưới 10 triệu`, `tầm 8 triệu`.
- Typo: `sofa phong khach`, `giuong ngu`.
- Follow-up: `rẻ hơn`, `màu khác`, `loại nhỏ hơn`, `còn hàng không`.
- Multi-clause, phủ định, category mơ hồ, no-result, provider timeout/503, invalid/fenced JSON, prompt injection.

## Metrics và thresholds ban đầu

| Metric | Định nghĩa | Threshold khởi đầu |
|---|---|---|
| Intent/category accuracy | exact match canonical fields | >= 90% category fixture |
| Budget extraction | min/max đúng | >= 90% price corpus |
| Clarification precision | hỏi khi gold cần hỏi | >= 85% |
| Recommendation validity | mọi ID tồn tại/active/fact đúng | 100% |
| Hallucination | fact/ID không trong backend DTO | 0% |
| Fallback/no-result rate | telemetry theo version | baseline, không threshold trước data |
| P95 latency | endpoint elapsed | quyết định sau baseline |
| Click-through | click DTO ID / impressions | đo riêng, không tối ưu trước validity |

## Regression strategy

Unit: normalization/budget/merge/negation/clarification/scoring. Integration: Prisma fixture kiểm hard filters, promotion and stock, same where/top-N. Provider contract: mocked timeout/retry/malformed/ID injection. E2E: widget keeps session/filter after clarification. Current test chỉ cover resilience mock (`backend/tests/h3.ai-resilience.test.js:1-39`), nên characterization phải là phase đầu.

Manual review mẫu 30 multi-turn Vietnamese mỗi release; annotate mismatch, false clarification, fabricated statement. Block release nếu recommendation validity/hallucination vi phạm.
