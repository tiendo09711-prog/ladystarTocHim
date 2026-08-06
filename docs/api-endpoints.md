# API endpoints

Base URL: `/api/v1`. Response thành công: `{ success, message, data }`; response lỗi: `{ success: false, message, errors }`.

## Auth và public

- `POST auth/register|login|logout|forgot-password|reset-password`, `GET auth/me`.
- `GET categories`, `categories/{slug}`, `brands`, `attributes`.
- `GET products`, `products/featured`, `products/new`, `products/sale`, `products/{slug}`.

## User

- Profile/password, CRUD địa chỉ, cart items, checkout preview/place-order.
- Order list/detail/cancel, wishlist add/remove, review create/update/delete.

## Admin

- `admin/auth/*`, `admin/dashboard/*`.
- CRUD categories, products, variants, images/ảnh đại diện, attributes/values, branches và coupons.
- Inventory list/transactions/import/adjust/transfer/low-stock.
- Order list/detail/status/payment/notes/cancel; customer status; review moderation.
- Import products; export products/orders/inventory/customers; barcode list/generate; GET/PUT settings.

Danh sách route đầy đủ: `cd backend && php artisan route:list --path=api/v1`.
