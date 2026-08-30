# LADYSTARS

Hệ thống thương mại điện tử LADYSTARS gồm React + TypeScript ở `frontend/` và Laravel REST API ở `backend/`.

## Chức năng

- Public: trang chủ, danh mục, tìm kiếm, lọc, sắp xếp, phân trang, chi tiết và biến thể sản phẩm.
- Khách: giỏ hàng tạm lưu trên trình duyệt; đăng ký/đăng nhập bằng Sanctum SPA cookie.
- User: hồ sơ, địa chỉ, giỏ hàng server, coupon, checkout transaction, lịch sử/theo dõi/hủy đơn, wishlist và review đủ điều kiện.
- Customer: hồ sơ, đơn hàng, đổi/trả, bảo hành, lịch hẹn và bảo mật tài khoản.
- Staff: truy cập backoffice theo RBAC/permission được cấp.
- Super Admin: toàn quyền, quản lý Staff, vai trò, audit log và reset mật khẩu khách hàng nội bộ.
- Vận hành: Order, Payment thủ công, Shipment thủ công, Refund thủ công, tồn kho, hậu mãi và Appointment nội bộ.
- Báo cáo: doanh thu gộp/thuần, hoàn tiền, giá vốn và lợi nhuận ước tính, sản phẩm, tồn kho, khách hàng.
- Bảo mật: Sanctum SPA cookie, rate limiting auth, guest tracking tách biệt, media hậu mãi private và không lưu bearer token trong `localStorage`.

## Yêu cầu

- PHP 8.3+, Composer, Node.js, npm, MySQL 8.x.
- Chromium cho Playwright.

## Cài backend

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan storage:link
php artisan serve
```

Trong terminal khác, chạy scheduler để tự động hết hạn đơn đang chờ:

```bash
php artisan schedule:work
```

Tạo database trước khi migrate:

```sql
CREATE DATABASE nam_hair CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Nếu dùng Docker Compose, copy `.env.example` thành `.env` ở thư mục root và tự đặt `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`; repository không cung cấp mật khẩu mặc định.

Backend mặc định ở `http://localhost:8000`.

### Laragon local

Khi dùng MySQL của Laragon, cấu hình `backend/.env` với `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=nam_hair`, `DB_USERNAME=root` và mật khẩu tương ứng. Chạy `php artisan migrate` để tạo/cập nhật schema; không dùng `migrate:fresh` trên database đang có dữ liệu.

## Cài frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Lệnh root này khởi động MySQL local (khi cần), Laravel API, Laravel Scheduler và React Vite; `Ctrl+C` dừng toàn bộ tiến trình ứng dụng con.

Frontend mặc định ở `http://localhost:5173`.

## Sanctum SPA local

- `VITE_API_URL=http://localhost:8000`.
- `FRONTEND_URL=http://localhost:5173`.
- `SANCTUM_STATEFUL_DOMAINS` chứa cả frontend và backend local.
- Axios dùng `withCredentials` và gọi `/sanctum/csrf-cookie` trước đăng nhập/đăng xuất.
- Không trộn `localhost` với `127.0.0.1` trong cùng phiên trình duyệt.

## Tạo tài khoản quản trị

Không có tài khoản quản trị mặc định. Tạo Super Admin bằng lệnh tương tác `php artisan users:create-super-admin`; mật khẩu không xuất hiện trong source hoặc shell history.

## Chạy kiểm tra

```bash
cd backend
php artisan test
./vendor/bin/pint --test

cd ../frontend
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npx playwright test --project=chromium
```

## Production

- Đọc và hoàn tất `docs/deployment-notes.md` trước bàn giao.
- Chạy `php artisan db:seed --force` chỉ để seed RBAC system data; demo data không được gọi bởi `DatabaseSeeder`.
- Chạy `php artisan after-sales:privatize-media` sau backup để chuyển evidence hậu mãi cũ sang private storage.
- Payment, Shipment và Refund vẫn là quy trình manual/internal; Phase 5 không gọi provider bên thứ ba.

## Database chính

`users`, `addresses`, `categories`, `brands`, `attributes`, `attribute_values`, `products`, `product_variants`, `product_variant_attribute_values`, `product_images`, `branches`, `inventories`, `inventory_transactions`, `carts`, `cart_items`, `wishlists`, `coupons`, `coupon_usages`, `orders`, `order_items`, `reviews`, `store_settings`.

## Tài liệu

Xem `docs/architecture.md`, `docs/database-schema.md`, `docs/api-endpoints.md`, `docs/authentication.md`, `docs/roles-and-permissions.md`, `docs/inventory-rules.md`, `docs/order-workflow.md`, `docs/excel-import-format.md` và `docs/deployment-notes.md`.
