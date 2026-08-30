# Authentication

Hệ thống dùng Laravel Sanctum SPA với session cookie HttpOnly và CSRF. Frontend gọi `/sanctum/csrf-cookie`, gửi request với `withCredentials: true`, và dùng `GET /api/v1/auth/me` để khôi phục phiên sau reload. Không lưu bearer token, role hoặc permission trong `localStorage`.

## Customer

- Đăng nhập qua `POST /api/v1/auth/login`; chỉ tài khoản active có `role=user` được chấp nhận.
- `/api/v1/account/*` dùng middleware `auth:sanctum` và `customer`, luôn giới hạn dữ liệu theo Customer hiện tại.
- Staff/Super Admin không được xem như Customer và frontend chuyển họ khỏi `/tai-khoan` về `/admin`.

## Staff và Super Admin

- Đăng nhập backoffice tại `/admin/login` qua `POST /api/v1/admin/auth/login`.
- Tài khoản active có `role=staff` hoặc `role=admin` được đăng nhập.
- `role=admin` là Super Admin và bypass permission; `role=staff` nhận permission hiệu lực từ các StaffRole.
- Staff bị block không đăng nhập được và bị từ chối ở request Admin kế tiếp.
- `GET /api/v1/auth/me` và `GET /api/v1/admin/auth/me` trả cùng resource an toàn gồm role, status, `is_super_admin`, `staff_roles` và `permissions`; không trả password/hash/token.

Logout chọn endpoint theo loại phiên: Customer dùng `POST /api/v1/auth/logout`, backoffice dùng `POST /api/v1/admin/auth/logout`.
