# Session storage decision (đề xuất)

## So sánh

| Lựa chọn | Restart persistence | Multi-instance | Chi phí/độ phức tạp | Phù hợp |
|---|---|---|---|---|
| In-memory Map | Không | Không | Thấp | Demo/local ngắn hạn |
| Prisma database | Có | Có | Trung bình, migration/cleanup | Đồ án cần history bền |
| Redis | TTL/lock tốt | Có | Hạ tầng mới | Scale/throughput cao |
| Hybrid Redis + DB analytics | Có | Có | Cao | Giai đoạn sau |

`backend/.env.example:17` ghi deployment boundary hiện là một Render instance và rate-limit in-memory process-local. Vì vậy **phase hiện tại đề xuất in-memory session store có TTL 24 giờ cho guest**, kèm warning rõ ràng: mất khi restart/deploy và chưa safe khi scale. Đây là lựa chọn nhỏ nhất cho đồ án nếu session chỉ phục vụ UX, không phải record thương mại.

## Nâng cấp

Khi cần persistence/multi-instance, chuyển adapter sang Redis (TTL 24h guest/30d authenticated, atomic lock/version) trước. Chỉ dùng Prisma khi có yêu cầu audit/history thật và retention/consent đã chốt; không tái sử dụng `ConversationMessage` support vì mô hình này có `senderId` bắt buộc và là domain khác (`backend/prisma/schema.prisma:397-431`). Không tạo schema trong phase docs này.

## Privacy và cleanup

Store tối thiểu: opaque ID hash, owner binding, intent snapshot, pending field, last recommendations ID/reason codes, version, expiry; không lưu raw chat/PII trừ khi có consent và retention policy. Cleanup lazy-on-read + periodic timer/Redis TTL. Reset phải xóa session state, không ảnh hưởng refresh session/auth.
