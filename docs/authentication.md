# Authentication

Sanctum SPA dùng session cookie HttpOnly và CSRF. Frontend gọi `/sanctum/csrf-cookie`, sau đó gửi request auth với `withCredentials: true`. `GET /api/v1/auth/me` khôi phục phiên sau reload.

Admin đăng nhập riêng tại `/admin/login` qua `/api/v1/admin/auth/login`. Backend từ chối tài khoản role `user`. Không lưu access token trong localStorage.
