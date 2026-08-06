# Định dạng Excel import

Cột: `name`, `base_sku`, `category`, `brand`, `description`, `material`, `base_type`, `variant_sku`, `barcode`, `color`, `length`, `density`, `base_size`, `price`, `sale_price`, `stock_quantity`, `branch_code`, `status`.

Frontend đọc file và preview bằng xlsx. Backend validate tối đa 500 dòng/lần, từ chối SKU/barcode trùng và tồn kho âm, trả lỗi kèm số dòng. File mẫu tải từ màn `/admin/import-export`.
