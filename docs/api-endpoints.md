# API endpoints

Base URL: `/api/v1`. Response thành công: `{ success, message, data }`; response lỗi: `{ success: false, message, errors }`.

## Auth và public

- `POST auth/register|login|logout|forgot-password|reset-password`, `GET auth/me`.
- `GET categories`, `categories/{slug}`, `brands`, `attributes`.
- `GET products`, `products/featured`, `products/new`, `products/sale`, `products/{slug}`.
- `GET payment-methods`: cấu hình COD/chuyển khoản công khai, chỉ gồm field an toàn.
- `POST orders/track`: guest tra cứu bằng mã đơn + số điện thoại, rate limit 6 lần/phút.

## User

- Profile/password, CRUD địa chỉ, cart items, checkout preview/place-order.
- Order list/detail/cancel, wishlist add/remove, review create/update/delete.
- Order detail trả timeline, payment và shipment của chính user.

## Admin

- `admin/auth/*`, `admin/dashboard/*`. Trừ login/me/logout, mọi route `/admin/*` đều có `permission:auto` hoặc `super_admin`; backend là source of truth và trả `403` khi thiếu quyền.
- CRUD categories, products, variants, images/ảnh đại diện, attributes/values, branches và coupons.
- Inventory list/transactions/import/adjust/transfer/low-stock.
- Order list/detail/status/payment/notes/cancel; customer status; review moderation.
- Import products; export products/orders/inventory/customers; barcode list/generate; GET/PUT settings.
- `PATCH admin/orders/{order}/payment-status`: cập nhật qua `PaymentService`, hỗ trợ `transaction_code` và `note` optional.
- `PUT admin/orders/{order}/shipment`, `PATCH admin/orders/{order}/shipment/status`: quản lý shipment thủ công.
- `POST|DELETE admin/settings/bank-qr`: upload/xóa ảnh QR local; chỉ Admin.

## Staff, role và permission

Các endpoint sau chỉ Super Admin (`role=admin`) được gọi:

- `GET|POST admin/staff`, `GET|PUT admin/staff/{staff}`: list, tạo, xem và cập nhật Staff.
- `PATCH admin/staff/{staff}/status`: block/unblock; không có hard-delete Staff.
- `PUT admin/staff/{staff}/roles`: đồng bộ nhiều StaffRole trong transaction.
- `PUT admin/staff/{staff}/password`: reset password bằng action riêng, không trả password/hash.
- `GET|POST admin/staff-roles`, `GET|PUT|DELETE admin/staff-roles/{staffRole}`: quản lý role; system role và role đang được gán không thể xóa.
- `PUT admin/staff-roles/{staffRole}/permissions`: đồng bộ permission đã validate.
- `GET admin/permissions`: catalog permission chỉ đọc; không có API tạo/sửa/xóa permission.

## Audit log

- `GET admin/audit-logs`: cần `audit.view`, hỗ trợ lọc actor, action, module, subject và khoảng thời gian.
- `GET admin/audit-logs/{auditLog}`: xem chi tiết before/after/metadata đã sanitize.
- Audit log append-only: không có endpoint create/update/delete.

Danh sách route đầy đủ: `cd backend && php artisan route:list --path=api/v1`.
