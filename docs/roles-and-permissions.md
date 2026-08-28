# Role và phân quyền

## Loại tài khoản

- `user`: Customer, chỉ dùng API public và `/api/v1/account/*` trên dữ liệu của chính mình.
- `staff`: Backoffice Staff, truy cập module Admin theo hợp permission của một hoặc nhiều StaffRole.
- `admin`: Super Admin, tương thích với Admin cũ và bypass toàn bộ permission mà không cần StaffRole.

`User::isAdmin()` tiếp tục nhận diện `admin` để tương thích code cũ. Quyền vào backoffice dùng `canAccessAdmin()` cho `staff|admin`; quyền Customer dùng `isCustomer()` và middleware `customer`.

## Mô hình RBAC

- `staff_roles`: vai trò hệ thống hoặc tùy chỉnh dành cho Staff.
- `permissions`: catalog chỉ đọc, được đồng bộ từ `PermissionRegistry`.
- `permission_staff_role`: permission của role.
- `staff_role_user`: nhiều role cho một Staff; permission hiệu lực là hợp của tất cả role.
- Super Admin không cần pivot và luôn vượt qua kiểm tra permission.
- Chỉ Super Admin được quản lý Staff, StaffRole và permission assignment; Staff không thể tự tăng quyền.
- Thay đổi status/role có hiệu lực ở request kế tiếp; Staff bị khóa không tiếp tục dùng Admin API.

## Permission catalog

- Dashboard: `dashboard.view`.
- Đơn hàng: `orders.view`, `orders.status.manage`, `orders.payment.manage`, `orders.shipment.manage`, `orders.notes.manage`.
- Hậu mãi: `returns.view`, `returns.manage`, `refunds.view`, `refunds.manage`, `warranties.view`, `warranties.manage`.
- Lịch hẹn: `appointments.view`, `appointments.manage`, `appointments.schedule.manage`.
- Khách hàng: `customers.view`, `customers.status.manage`, `consultations.view`, `consultations.manage`, `reviews.view`, `reviews.manage`.
- Catalog: `products.view`, `products.manage`, `catalog.view`, `catalog.manage`, `branches.view`, `branches.manage`, `services.view`, `services.manage`.
- Kho và dữ liệu: `inventory.view`, `inventory.adjust`, `inventory.transfer`, `barcodes.view`, `barcodes.manage`, `import.products`, `export.products`, `export.orders`, `export.inventory`, `export.customers`.
- Marketing: `coupons.view`, `coupons.manage`, `promotions.view`, `promotions.manage`.
- Nội dung: `content.home.manage`, `content.store.manage`, `content.contact.manage`, `content.about.manage`, `content.catalog.manage`, `content.news.manage`, `content.guides.manage`.
- Hệ thống: `settings.view`, `settings.manage`, `audit.view`.

## Role mặc định

- `sales`: đơn hàng, khách hàng, tư vấn, lịch hẹn và quyền xem hậu mãi cần cho bán hàng.
- `warehouse`: vận chuyển đơn, tồn kho, barcode, đổi/trả và bảo hành.
- `customer-service`: đơn hàng, khách hàng, tư vấn, review, đổi/trả, hoàn tiền dạng xem, bảo hành và lịch hẹn.
- `marketing`: dashboard, coupon, promotion và xem review.
- `content`: dịch vụ và toàn bộ nội dung website.
- `manager`: toàn bộ permission catalog.

Middleware `auth:sanctum` xác thực phiên, `admin` chặn tài khoản ngoài backoffice, `permission:auto` ánh xạ route/method sang permission, và `super_admin` bảo vệ API quản lý Staff/Role.
