# Luồng đơn hàng

Luồng chuẩn: `pending → confirmed → processing → shipping → completed`.

- User chỉ hủy khi `pending`.
- Admin có thể hủy `pending`, `confirmed` hoặc `processing`; không hủy `shipping/completed` qua workflow hiện tại.
- `completed_at` được ghi khi hoàn thành; `cancelled_at` được ghi khi hủy.
- Payment/order payment status: `unpaid|paid|partially_refunded|refunded`; phương thức `cod|bank_transfer`.

## Phase 2

- Mỗi lần chuyển trạng thái hợp lệ tạo một `order_status_histories` trong cùng transaction; checkout tạo mốc `pending` đầu tiên.
- Guest tra cứu bằng đồng thời `order_number` và `customer_phone`; response không có `admin_note`.
- Mỗi order có tối đa một payment chính. `payments.unpaid|paid|partially_refunded|refunded` đồng bộ với `orders.payment_status` qua `PaymentService` và `RefundService`.
- COD và chuyển khoản đều bắt đầu ở trạng thái chờ. Admin xác nhận đã thu tiền, hệ thống ghi `verified_by` và `paid_at`.
- Chuyển khoản dùng thông tin ngân hàng và ảnh QR do Admin upload local; không gọi API ngân hàng/VietQR.
- Mỗi order có tối đa một shipment thủ công. Admin lưu carrier/tracking khi order `confirmed|processing`, bàn giao để chuyển `processing → shipping`, rồi giao thành công để chuyển `shipping → completed`.

## Phase 3 — Refund

- Mỗi giao dịch hoàn tiền nằm trong bảng `refunds`, liên kết payment, order và return request khi có.
- Refund có vòng đời `pending|completed|cancelled`; chỉ refund completed được cộng vào số tiền đã hoàn.
- Tổng hoàn nhỏ hơn payment tạo trạng thái `partially_refunded`; hoàn đủ tạo `refunded`; hệ thống không cho hoàn vượt số tiền đã thanh toán.
