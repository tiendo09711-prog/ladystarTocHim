# Kiến trúc

## Tổng quan

- `frontend/`: React 19, TypeScript strict, Vite, Tailwind CSS, React Router, Axios, TanStack Query, Recharts, xlsx và react-barcode.
- `backend/`: Laravel 13 REST API version `/api/v1`, Sanctum SPA, Eloquent, Form Request, API Resource và service transaction.
- `database`: MySQL 8.x production/local; SQLite in-memory cho automated tests.

## Luồng dữ liệu

React gọi Axios client có cookie → route API → middleware auth/admin → Form Request → controller → service/Eloquent transaction → JSON response thống nhất.

`CheckoutService` là nơi tính lại giá, coupon, phí giao hàng, khóa dòng inventory, giữ tồn kho, tạo order snapshot và xóa cart. `InventoryService` đảm bảo tồn kho không âm và tạo lịch sử.
