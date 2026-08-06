# Role và phân quyền

- `user`: quản lý tài khoản, địa chỉ, cart, order của chính mình, wishlist và review hợp lệ.
- `admin`: truy cập API `/api/v1/admin/*`, quản lý catalog, inventory, order, customer, promotion và reporting.

Middleware `auth:sanctum` xác thực. Middleware `admin` kiểm tra role. Query tài nguyên user luôn giới hạn theo `user_id` hiện tại.
