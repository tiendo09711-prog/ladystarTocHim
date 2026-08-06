# Quy tắc tồn kho

- Tồn khả dụng = `quantity_on_hand - quantity_reserved`.
- Checkout khóa dòng inventory và tăng `quantity_reserved`.
- Xác nhận đơn giảm đồng thời `quantity_on_hand` và `quantity_reserved`.
- Hủy đơn pending giải phóng reserved; hủy sau xác nhận hoàn lại on-hand.
- Điều chỉnh và chuyển kho không được làm tồn khả dụng âm.
- Mọi thay đổi tạo `inventory_transactions`.
