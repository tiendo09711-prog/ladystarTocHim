<?php

namespace Database\Seeders;

use App\Models\AppointmentSchedule;
use App\Models\Attribute;
use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\HomePageContent;
use App\Models\NewsArticle;
use App\Models\NewsPageContent;
use App\Models\Order;
use App\Models\PageSeo;
use App\Models\Product;
use App\Models\Review;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use LogicException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (! $this->container->environment('testing')) {
            throw new LogicException('DemoDataSeeder is restricted to the testing environment.');
        }

        $this->call(RbacSeeder::class);
        $testPassword = env('E2E_ADMIN_PASSWORD', Str::random(40));
        $admin = User::updateOrCreate(['email' => 'admin@namhair.local'], ['name' => 'Quản trị LADYSTARS', 'phone' => '0900000001', 'password' => $testPassword, 'role' => 'admin', 'status' => 'active']);
        $user = User::updateOrCreate(['email' => 'user@namhair.local'], ['name' => 'Khách hàng mẫu', 'phone' => '0900000002', 'password' => Str::random(40), 'role' => 'user', 'status' => 'active']);
        $branch = Branch::updateOrCreate(['code' => 'MAIN'], ['name' => 'LADYSTARS - Chi nhánh trung tâm', 'phone' => '02873008899', 'province' => 'TP. Hồ Chí Minh', 'district' => 'Quận 3', 'ward' => 'Phường 6', 'address_line' => '123 Đường Mẫu', 'is_default' => true, 'is_active' => true]);
        StoreSetting::updateOrCreate([], ['store_name' => 'LADYSTARS', 'support_phone' => '02873008899', 'support_email' => 'hello@ladystars.local', 'store_address' => '123 Đường Mẫu, Quận 3, TP. Hồ Chí Minh', 'currency' => 'VND', 'shipping_fee' => 30000, 'free_shipping_from' => 1000000, 'low_stock_threshold' => 3, 'order_prefix' => 'LS', 'cod_enabled' => true, 'bank_transfer_enabled' => true, 'returns_enabled' => true, 'return_window_days' => 7, 'exchange_enabled' => true, 'exchange_window_days' => 7, 'refund_shipping_on_full_return' => false, 'warranty_enabled' => true, 'appointments_enabled' => true, 'appointment_cancel_before_hours' => 4, 'store_timezone' => 'Asia/Ho_Chi_Minh']);

        $categoryNames = ['Tóc giả nam nguyên đầu', 'Tóc giả nam bán phần', 'Tóc dán nam', 'Toupee nam', 'Hair system nam', 'Tóc mái nam', 'Tóc kẹp nam', 'Tóc giả nam tóc thật', 'Tóc giả nam sợi tổng hợp', 'Phụ kiện tóc giả', 'Keo dán tóc', 'Dung dịch vệ sinh', 'Lược và dụng cụ chăm sóc'];
        $categories = collect($categoryNames)->map(fn ($name, $index) => Category::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'description' => "Danh mục {$name} tại LADYSTARS", 'is_active' => true, 'show_in_menu' => true, 'sort_order' => $index + 1]));
        $brands = collect(['LADYSTARS Select', 'Urban Crown', 'Gentleman System'])->map(fn ($name) => Brand::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'description' => "Thương hiệu {$name}", 'is_active' => true]));

        foreach (range(0, 6) as $dayOfWeek) {
            AppointmentSchedule::updateOrCreate(['branch_id' => $branch->id, 'day_of_week' => $dayOfWeek, 'start_time' => '09:00:00'], ['end_time' => '18:00:00', 'slot_minutes' => 30, 'capacity' => 2, 'is_active' => true]);
        }

        $attributeData = [
            'color' => ['Màu tóc', ['Đen tự nhiên', 'Đen nâu', 'Nâu đậm', 'Muối tiêu']],
            'length' => ['Chiều dài', ['10 cm', '15 cm', '20 cm']],
            'density' => ['Mật độ', ['100%', '120%', '140%']],
            'base_size' => ['Kích thước đế', ['15x20 cm', '18x23 cm', '20x25 cm']],
            'base_type' => ['Loại đế', ['Đế da PU', 'Đế lace', 'Đế mono', 'Đế kết hợp lace và PU', 'Đế siêu mỏng']],
        ];
        $attributes = collect();
        foreach ($attributeData as $code => [$name, $values]) {
            $displayStyles = ['base_size' => 'buttons', 'color' => 'image_swatches', 'base_type' => 'image_cards'];
            $sortOrders = ['base_size' => 10, 'color' => 20, 'base_type' => 30];
            $attribute = Attribute::updateOrCreate(['code' => $code], ['name' => $name, 'type' => $code === 'color' ? 'color' : 'select', 'display_style' => $displayStyles[$code] ?? 'buttons', 'sort_order' => $sortOrders[$code] ?? 90, 'is_filterable' => true, 'is_variant_attribute' => true, 'is_active' => true]);
            foreach ($values as $index => $value) {
                $attribute->values()->updateOrCreate(['value' => Str::slug($value)], ['display_value' => $value, 'option_code' => strtoupper(substr(Str::slug($value, ''), 0, 4)), 'description' => $code === 'base_type' ? 'Thông tin chi tiết về '.$value.'.' : null, 'color_code' => $code === 'color' ? ['#171717', '#30251f', '#563d2c', '#8a8178'][$index] : null, 'sort_order' => $index, 'is_active' => true]);
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
            $product->update(['warranty_days' => 30]);
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
                $base = $attributes['base_type']->values[($index + $variantIndex) % $attributes['base_type']->values->count()];
                DB::table('product_variant_attribute_values')->updateOrInsert(['product_variant_id' => $variant->id, 'attribute_id' => $attributes['color']->id], ['attribute_value_id' => $color->id]);
                DB::table('product_variant_attribute_values')->updateOrInsert(['product_variant_id' => $variant->id, 'attribute_id' => $attributes['base_size']->id], ['attribute_value_id' => $size->id]);
                DB::table('product_variant_attribute_values')->updateOrInsert(['product_variant_id' => $variant->id, 'attribute_id' => $attributes['base_type']->id], ['attribute_value_id' => $base->id]);
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
        $this->call(NewsPageContentSeeder::class);
        HomePageContent::updateOrCreate(['page_key' => 'home'], [
            'announcement_messages' => ['Thông báo kiểm thử thứ nhất', 'Thông báo kiểm thử thứ hai'],
            'announcement_interval_seconds' => 5,
            'announcement_enabled' => true,
            'sections' => $this->homeSections(),
        ]);
        NewsPageContent::updateOrCreate(['page_key' => 'promotions'], [
            'eyebrow' => 'ƯU ĐÃI', 'title' => 'Ưu đãi dành riêng cho bạn', 'description' => 'Nội dung kiểm thử.',
            'featured_badge_label' => 'Ưu đãi nổi bật', 'list_eyebrow' => 'DANH SÁCH', 'list_title' => 'Ưu đãi mới nhất',
            'list_description' => 'Nội dung kiểm thử.', 'show_cta' => false,
        ]);
        PageSeo::updateOrCreate(['page_key' => 'uu-dai'], ['title' => 'Ưu đãi', 'description' => 'Nội dung kiểm thử.']);
        $this->call(HairFinderConfigSeeder::class);
    }

    private function homeSections(): array
    {
        return [
            'hero' => ['eyebrow' => 'Test', 'title' => 'Test', 'description' => 'Test', 'primary_label' => 'Test', 'primary_url' => '/', 'secondary_label' => 'Test', 'secondary_url' => '/', 'trust_items' => ['Test'], 'note_label' => 'Test', 'note_value' => 'Test'],
            'consultation' => ['kicker' => 'Test', 'title' => 'Test', 'description' => 'Test', 'options' => ['Test'], 'cta_label' => 'Test', 'cta_url' => '/'],
            'products' => ['kicker' => 'Test', 'title' => 'Test', 'description' => 'Test', 'featured_label' => 'Test', 'view_all_label' => 'Test', 'view_all_url' => '/'],
            'brand_story' => ['kicker' => 'Test', 'title' => 'Test', 'description' => 'Test', 'image_alt' => 'Test', 'values' => [['title' => 'Test', 'description' => 'Test']], 'cta_label' => 'Test', 'cta_url' => '/'],
            'solutions' => ['kicker' => 'Test', 'title' => 'Test', 'description' => 'Test', 'bullets' => ['Test'], 'cta_label' => 'Test', 'cta_url' => '/', 'art_text' => 'Test', 'image_path' => null, 'image_alt' => 'Test'],
            'styles' => ['kicker' => 'Test', 'title' => 'Test', 'items' => [['title' => 'Test', 'description' => 'Test', 'url' => '/', 'image_path' => null, 'image_alt' => 'Test']]],
            'process' => ['kicker' => 'Test', 'title' => 'Test', 'description' => 'Test', 'steps' => [['number' => '01', 'title' => 'Test', 'description' => 'Test', 'image_path' => null, 'image_alt' => 'Test']], 'cta_label' => 'Test', 'cta_url' => '/'],
            'testimonials' => ['kicker' => 'Test', 'title' => 'Test', 'items' => [['quote' => 'Test', 'customer' => 'Test', 'label' => 'Test', 'detail_title' => 'Test', 'detail' => 'Test', 'image_path' => null, 'image_alt' => 'Test']]],
            'contact' => ['kicker' => 'Test', 'title' => 'Test', 'description' => 'Test', 'cards' => [['title' => 'Test', 'description' => 'Test', 'url' => '/']]],
            'insights' => ['kicker' => 'Test', 'title' => 'Test', 'items' => [['title' => 'Test', 'description' => 'Test', 'url' => '/']]],
            'final_cta' => ['kicker' => 'Test', 'title' => 'Test', 'description' => 'Test', 'primary_label' => 'Test', 'primary_url' => '/', 'secondary_label' => 'Test', 'secondary_url' => '/'],
            'floating_contact' => ['trigger_label' => 'Test', 'consultation_label' => 'Test', 'consultation_url' => '/', 'guide_label' => 'Test', 'guide_url' => '/'],
        ];
    }
}
