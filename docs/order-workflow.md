# Luồng đơn hàng

Luồng chuẩn: `pending → confirmed → processing → shipping → completed`.

- User chỉ hủy khi `pending`.
- Admin có thể hủy `pending`, `confirmed` hoặc `processing`; không hủy `shipping/completed` qua workflow hiện tại.
- `completed_at` được ghi khi hoàn thành; `cancelled_at` được ghi khi hủy.
- Payment ban đầu: `unpaid|paid|refunded`; phương thức `cod|bank_transfer`.
