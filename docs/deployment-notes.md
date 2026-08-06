# Deployment notes

- Dùng MySQL 8.x, `APP_ENV=production`, `APP_DEBUG=false`, HTTPS và cookie secure.
- Đặt `APP_URL`, `FRONTEND_URL`, `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS` đúng domain thật.
- Chạy `php artisan migrate --force`, `storage:link`, cache config/route và build frontend.
- Đổi toàn bộ mật khẩu seed; cấu hình mail thật cho reset password.
- Backup database và storage trước migrate; không dùng SQLite production.
- Cấu hình web server phục vụ `backend/public` và frontend SPA fallback về `index.html`.
