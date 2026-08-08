<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\NewsArticle;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(['email' => 'admin@namhair.local'], ['name' => 'Quản trị Nam Hair', 'phone' => '0900000001', 'password' => 'Admin@123456', 'role' => 'admin', 'status' => 'active']);
        $user = User::updateOrCreate(['email' => 'user@namhair.local'], ['name' => 'Khách hàng mẫu', 'phone' => '0900000002', 'password' => 'User@123456', 'role' => 'user', 'status' => 'active']);
        $branch = Branch::updateOrCreate(['code' => 'MAIN'], ['name' => 'Nam Hair - Chi nhánh trung tâm', 'phone' => '02873008899', 'province' => 'TP. Hồ Chí Minh', 'district' => 'Quận 3', 'ward' => 'Phường 6', 'address_line' => '123 Đường Mẫu', 'is_default' => true, 'is_active' => true]);

        $categoryNames = ['Tóc giả nam nguyên đầu', 'Tóc giả nam bán phần', 'Tóc dán nam', 'Toupee nam', 'Hair system nam', 'Tóc mái nam', 'Tóc kẹp nam', 'Tóc giả nam tóc thật', 'Tóc giả nam sợi tổng hợp', 'Phụ kiện tóc giả', 'Keo dán tóc', 'Dung dịch vệ sinh', 'Lược và dụng cụ chăm sóc'];
        $categories = collect($categoryNames)->map(fn ($name, $index) => Category::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'description' => "Danh mục {$name} tại Nam Hair", 'is_active' => true, 'sort_order' => $index + 1]));
        $brands = collect(['Nam Hair Select', 'Urban Crown', 'Gentleman System'])->map(fn ($name) => Brand::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'description' => "Thương hiệu {$name}", 'is_active' => true]));

        $attributeData = [
            'color' => ['Màu tóc', ['Đen tự nhiên', 'Đen nâu', 'Nâu đậm', 'Muối tiêu']],
            'length' => ['Chiều dài', ['10 cm', '15 cm', '20 cm']],
            'density' => ['Mật độ', ['100%', '120%', '140%']],
            'base_size' => ['Kích thước đế', ['15x20 cm', '18x23 cm', '20x25 cm']],
            'base_type' => ['Loại đế', ['Đế da PU', 'Đế lace', 'Đế mono', 'Đế kết hợp lace và PU', 'Đế siêu mỏng']],
        ];
        $attributes = collect();
        foreach ($attributeData as $code => [$name, $values]) {
            $attribute = Attribute::updateOrCreate(['code' => $code], ['name' => $name, 'type' => $code === 'color' ? 'color' : 'select', 'is_filterable' => true, 'is_variant_attribute' => true, 'is_active' => true]);
            foreach ($values as $index => $value) {
                $attribute->values()->updateOrCreate(['value' => Str::slug($value)], ['display_value' => $value, 'sort_order' => $index, 'is_active' => true]);
            }
            $attributes[$code] = $attribute->load('values');
        }

        $materials = ['Tóc người thật', 'Tóc Remy', 'Tóc tổng hợp', 'Tóc pha'];
        $baseTypes = ['Đế da PU', 'Đế lace', 'Đế mono', 'Đế kết hợp lace và PU', 'Đế siêu mỏng'];
        $productNames = ['Hair System Classic', 'Toupee Lace Natural', 'Tóc Dán Ultra Thin', 'Hair System Mono Pro', 'Toupee Phủ Bạc', 'Tóc Mái Nam Natural', 'Hair System Sport', 'Toupee Remy Premium', 'Tóc Giả Nguyên Đầu Urban', 'Hair System Daily', 'Toupee PU Skin', 'Tóc Kẹp Nam Volume', 'Hair System Executive', 'Toupee Lace Front', 'Hair System Comfort'];
        $products = collect();
        foreach ($productNames as $index => $name) {
            $sku = 'NH'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
            $product = Product::updateOrCreate(['base_sku' => $sku], [
                'category_id' => $categories[$index % $categories->count()]->id, 'brand_id' => $brands[$index % $brands->count()]->id,
                'name' => $name, 'slug' => Str::slug($name), 'short_description' => 'Thiết kế tự nhiên, dễ sử dụng và chăm sóc.',
                'description' => "{$name} dành cho nam, thiết kế gọn nhẹ và phù hợp nhiều nhu cầu sử dụng.",
                'material' => $materials[$index % count($materials)], 'base_type' => $baseTypes[$index % count($baseTypes)], 'origin' => 'Việt Nam',
                'estimated_lifespan' => '6-12 tháng tùy cách sử dụng', 'usage_instructions' => 'Làm sạch da đầu, căn chỉnh và cố định sản phẩm theo hướng dẫn.',
                'care_instructions' => 'Vệ sinh bằng dung dịch chuyên dụng, để khô tự nhiên.', 'warranty_information' => 'Bảo hành kỹ thuật 30 ngày.',
                'status' => 'active', 'is_featured' => $index < 6, 'is_new' => $index >= 9, 'published_at' => now()->subDays($index),
            ]);
            $product->images()->delete();
            $product->images()->create(['image_path' => '/images/product-placeholder.svg', 'alt_text' => $name, 'sort_order' => 0, 'is_primary' => true]);
            foreach ([1, 2] as $variantIndex) {
                $variant = $product->variants()->updateOrCreate(['sku' => "{$sku}-{$variantIndex}"], [
                    'barcode' => '893'.str_pad((string) (($index + 1) * 10 + $variantIndex), 10, '0', STR_PAD_LEFT),
                    'price' => 1450000 + $index * 85000 + $variantIndex * 50000,
                    'sale_price' => ($index + $variantIndex) % 3 === 0 ? 1290000 + $index * 80000 : null,
                    'cost_price' => 850000 + $index * 40000, 'weight' => 120 + $variantIndex * 10, 'status' => 'active',
                ]);
                $color = $attributes['color']->values[($index + $variantIndex) % $attributes['color']->values->count()];
                $size = $attributes['base_size']->values[($index + $variantIndex) % $attributes['base_size']->values->count()];
                DB::table('product_variant_attribute_values')->updateOrInsert(['product_variant_id' => $variant->id, 'attribute_id' => $attributes['color']->id], ['attribute_value_id' => $color->id]);
                DB::table('product_variant_attribute_values')->updateOrInsert(['product_variant_id' => $variant->id, 'attribute_id' => $attributes['base_size']->id], ['attribute_value_id' => $size->id]);
                Inventory::updateOrCreate(['branch_id' => $branch->id, 'product_variant_id' => $variant->id], ['quantity_on_hand' => 8 + (($index + $variantIndex) % 14), 'quantity_reserved' => 0, 'reorder_level' => 4]);
            }
            $products->push($product);
        }

        Coupon::updateOrCreate(['code' => 'NAMHAIR10'], ['type' => 'percentage', 'value' => 10, 'minimum_order_amount' => 500000, 'maximum_discount_amount' => 300000, 'usage_limit' => 500, 'usage_limit_per_user' => 3, 'used_count' => 0, 'starts_at' => now()->subDay(), 'expires_at' => now()->addYear(), 'is_active' => true]);
        Coupon::updateOrCreate(['code' => 'FREESHIP'], ['type' => 'fixed', 'value' => 30000, 'minimum_order_amount' => 300000, 'used_count' => 0, 'expires_at' => now()->addMonths(6), 'is_active' => true]);

        if (! Order::where('order_number', 'NH-DEMO-001')->exists()) {
            $variant = $products[0]->variants()->first();
            $order = Order::create(['order_number' => 'NH-DEMO-001', 'user_id' => $user->id, 'branch_id' => $branch->id, 'customer_name' => $user->name, 'customer_email' => $user->email, 'customer_phone' => $user->phone, 'province' => 'TP. Hồ Chí Minh', 'district' => 'Quận 1', 'ward' => 'Bến Nghé', 'shipping_address' => '10 Nguyễn Huệ', 'subtotal' => $variant->currentPrice(), 'discount_amount' => 0, 'shipping_fee' => 0, 'total_amount' => $variant->currentPrice(), 'payment_method' => 'cod', 'payment_status' => 'paid', 'order_status' => 'completed', 'completed_at' => now()->subDays(2)]);
            $item = $order->items()->create(['product_id' => $products[0]->id, 'product_variant_id' => $variant->id, 'product_name' => $products[0]->name, 'variant_description' => $variant->sku, 'sku' => $variant->sku, 'barcode' => $variant->barcode, 'unit_price' => $variant->currentPrice(), 'quantity' => 1, 'line_total' => $variant->currentPrice()]);
            Review::create(['user_id' => $user->id, 'product_id' => $products[0]->id, 'order_item_id' => $item->id, 'rating' => 5, 'title' => 'Tự nhiên và dễ dùng', 'content' => 'Sản phẩm phù hợp, tư vấn rõ ràng.', 'status' => 'approved']);
        }

        $user->addresses()->updateOrCreate(['address_line' => '10 Nguyễn Huệ'], ['recipient_name' => $user->name, 'phone' => $user->phone, 'province' => 'TP. Hồ Chí Minh', 'district' => 'Quận 1', 'ward' => 'Bến Nghé', 'is_default' => true]);

        NewsArticle::updateOrCreate(['slug' => 'chao-mung-den-voi-ladystars'], [
            'title' => 'Chào mừng đến với bản tin LADYSTARS',
            'excerpt' => 'Nơi LADYSTARS chia sẻ cẩm nang chăm sóc, câu chuyện thương hiệu và những cập nhật mới nhất.',
            'content' => "Bản tin LADYSTARS là nơi chúng tôi chia sẻ những kiến thức hữu ích về lựa chọn, sử dụng và chăm sóc tóc.\n\nHãy quay lại thường xuyên để không bỏ lỡ nội dung mới.",
            'category' => 'Cẩm nang',
            'author_id' => $admin->id,
            'status' => 'draft',
            'sort_order' => 0,
        ]);

        $this->call(AboutContentSeeder::class);
        $this->call(CatalogContentSeeder::class);
    }
}
