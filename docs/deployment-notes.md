# Production deployment notes

## Checklist bắt buộc

- `APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL` phù hợp vận hành.
- Bắt buộc HTTPS và `SESSION_SECURE_COOKIE=true`.
- Cấu hình đúng `APP_URL`, `FRONTEND_URL`, `FRONTEND_URLS`, `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS` và CORS.
- Set `VITE_API_URL` đúng domain API tại thời điểm build frontend.
- `PASSWORD_RESET_EMAIL_ENABLED=false` khi chưa có mail provider; frontend dùng `VITE_PASSWORD_RESET_EMAIL_ENABLED=false` và hướng khách liên hệ hỗ trợ.
- Không ghi secret hoặc credential thật vào repository.

## Backup và migration

1. Backup toàn bộ MySQL database.
2. Backup `backend/storage`, đặc biệt media hậu mãi.
3. Kiểm tra khả năng restore backup trước khi tiếp tục.
4. Chạy `php artisan migrate --force`.
5. Chạy `php artisan db:seed --force` để đồng bộ RBAC system data.
6. Chạy `php artisan after-sales:privatize-media`; command idempotent, giữ record khi file mất và báo file thiếu.

Không bao giờ chạy `migrate:fresh`, `db:wipe` hoặc DemoDataSeeder trên production.

## Super Admin và demo data

- Production seeding không tạo Admin, Customer, Product hoặc Order demo.
- Tạo tài khoản thật bằng `php artisan users:create-super-admin`; password được nhập bằng hidden prompt và không đi qua command-line argument.
- Xác minh không còn credential demo trong UI, HTML, biến môi trường production hoặc tài liệu bàn giao.

## Scheduler — REQUIRED

Laravel scheduler phải chạy liên tục. Linux cron mẫu:

```bash
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

Có thể dùng Supervisor/Systemd tương đương. Nếu scheduler dừng, pending order không expire, inventory reservation có thể bị giữ và coupon reservation có thể không được release.

## Storage và quyền truy cập

- Web server chỉ public `backend/public`; cấp quyền ghi phù hợp cho `backend/storage` và `bootstrap/cache`.
- Product/CMS image tiếp tục dùng public storage.
- Return/Warranty evidence dùng private disk và chỉ được tải qua endpoint có auth/ownership/permission hoặc temporary signed guest URL.
- Backup cả public và private storage.

## Build và cache

```bash
cd backend
php artisan config:cache
php artisan route:cache

cd ../frontend
npm ci
npm run build
```

Web server frontend phải fallback SPA về `index.html`.

## Quy trình vận hành nội bộ

- Payment: Staff xác minh thủ công và cập nhật trạng thái/mã giao dịch trong backoffice.
- Shipment: Staff nhập đơn vị vận chuyển, mã vận đơn và cập nhật shipped/delivered thủ công.
- Refund: Staff có quyền hoàn tiền ghi nhận giao dịch thủ công; không gọi cổng thanh toán.
- Password recovery: khi email reset tắt, Customer liên hệ hỗ trợ; chỉ Super Admin được reset mật khẩu Customer và thao tác được audit.

## Kiểm tra sau deploy

- Health endpoint, đăng nhập Customer/Super Admin và Sanctum cookie.
- Public product không chứa `cost_price`; registered order không truy cập được guest tracking.
- Reports chỉ hiển thị cho `reports.view`; số liệu dùng `completed_at` và refund dùng `refunds.completed_at`.
- Scheduler chạy, media private tải đúng quyền, không có demo account và Super Admin thật đã được tạo.
