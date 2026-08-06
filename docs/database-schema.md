# Database schema

- Identity: `users` 1-n `addresses`, `orders`; email unique, phone unique khi có.
- Catalog: `categories` self-reference; `brands`; `products` soft delete; `product_variants` soft delete; `product_images`.
- Attributes: `attributes` 1-n `attribute_values`; pivot `product_variant_attribute_values` unique theo biến thể + thuộc tính.
- Inventory: `branches`; `inventories` unique theo chi nhánh + biến thể; mọi thay đổi ghi `inventory_transactions`.
- Commerce: `carts` 1-1 user; `cart_items` unique theo cart + variant; `orders` 1-n `order_items` lưu snapshot.
- Engagement: `wishlists` unique user + product; `reviews` unique order item.
- Promotion: `coupons`, `coupon_usages`.
- Store configuration: `store_settings` lưu thông tin liên hệ, phí giao hàng, ngưỡng miễn phí, ngưỡng tồn kho và tiền tố mã đơn.

Sản phẩm dùng soft delete. Danh mục có sản phẩm bị chặn xóa. Order item dùng foreign key restrict để giữ lịch sử.
