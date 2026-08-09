<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_page_contents', function (Blueprint $table) {
            $table->id();
            $table->string('page_key', 60)->unique()->default('store-locations');
            $table->string('eyebrow', 120)->nullable();
            $table->string('title', 190)->nullable();
            $table->text('description')->nullable();
            $table->string('hero_image_path')->nullable();
            $table->string('hero_image_alt', 190)->nullable();
            $table->string('locations_eyebrow', 120)->nullable();
            $table->string('locations_title', 190)->nullable();
            $table->text('locations_description')->nullable();
            $table->string('empty_title', 190)->nullable();
            $table->text('empty_description')->nullable();
            $table->string('support_title', 190)->nullable();
            $table->text('support_description')->nullable();
            $table->string('process_eyebrow', 120)->nullable();
            $table->string('process_title', 190)->nullable();
            $table->text('process_description')->nullable();
            $table->string('policies_eyebrow', 120)->nullable();
            $table->string('policies_title', 190)->nullable();
            $table->text('policies_description')->nullable();
            $table->string('contact_eyebrow', 120)->nullable();
            $table->string('contact_title', 190)->nullable();
            $table->text('contact_description')->nullable();
            $table->string('contact_image_path')->nullable();
            $table->string('contact_image_alt', 190)->nullable();
            $table->json('settings_json')->nullable();
            $table->timestamps();
        });

        Schema::create('store_page_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_page_content_id')->constrained()->cascadeOnDelete();
            $table->string('item_type', 30)->index();
            $table->string('title', 190);
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->string('image_alt', 190)->nullable();
            $table->string('icon', 40)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->text('public_description')->nullable()->after('address_line');
            $table->string('opening_hours')->nullable()->after('public_description');
            $table->string('image_path')->nullable()->after('opening_hours');
            $table->string('image_alt', 190)->nullable()->after('image_path');
            $table->decimal('latitude', 10, 7)->nullable()->after('image_alt');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->string('booking_url', 500)->nullable()->after('longitude');
            $table->string('map_url', 500)->nullable()->after('booking_url');
            $table->boolean('show_on_store_page')->default(true)->after('map_url');
            $table->unsignedInteger('public_sort_order')->default(0)->after('show_on_store_page');
        });

        $now = now();
        $contentId = DB::table('store_page_contents')->insertGetId([
            'page_key' => 'store-locations',
            'eyebrow' => 'KHÔNG GIAN LADYSTARS',
            'title' => 'Tìm điểm tư vấn gần bạn',
            'description' => 'Khám phá không gian trải nghiệm, chọn chi nhánh phù hợp và đặt lịch tư vấn riêng cùng đội ngũ LADYSTARS.',
            'hero_image_path' => '/images/brand/ladystars-hero.svg',
            'hero_image_alt' => 'Không gian tư vấn LADYSTARS',
            'locations_eyebrow' => 'HỆ THỐNG CỬA HÀNG',
            'locations_title' => 'Chọn nơi bạn muốn ghé thăm',
            'locations_description' => 'Mỗi địa điểm đều được thiết kế để bạn có thời gian thử, trao đổi và lựa chọn giải pháp phù hợp trong sự riêng tư.',
            'empty_title' => 'Chưa có địa điểm phù hợp',
            'empty_description' => 'Hãy để lại thông tin, đội ngũ LADYSTARS sẽ liên hệ và hỗ trợ bạn từ xa.',
            'support_title' => 'Chưa có cửa hàng gần bạn?',
            'support_description' => 'Đội ngũ tư vấn có thể hỗ trợ từ xa, hướng dẫn đo và lựa chọn sản phẩm theo nhu cầu thực tế.',
            'process_eyebrow' => 'TRẢI NGHIỆM LINH HOẠT',
            'process_title' => 'Quy trình tư vấn và đặt hàng',
            'process_description' => 'Một hành trình rõ ràng, riêng tư và có chuyên viên đồng hành ở từng bước.',
            'policies_eyebrow' => 'AN TÂM LỰA CHỌN',
            'policies_title' => 'Cam kết dành cho bạn',
            'policies_description' => 'Những tiêu chuẩn giúp trải nghiệm mua sắm minh bạch và nhẹ nhàng hơn.',
            'contact_eyebrow' => 'ĐẶT LỊCH RIÊNG',
            'contact_title' => 'Để LADYSTARS chuẩn bị buổi tư vấn dành riêng cho bạn',
            'contact_description' => 'Chia sẻ thông tin cơ bản, đội ngũ sẽ liên hệ xác nhận thời gian và nhu cầu trước khi bạn ghé cửa hàng.',
            'contact_image_path' => '/images/brand/ladystars-hero.svg',
            'contact_image_alt' => 'Đặt lịch tư vấn tại LADYSTARS',
            'settings_json' => json_encode([
                'services' => ['Tư vấn lựa chọn sản phẩm', 'Thử và điều chỉnh kiểu tóc', 'Hướng dẫn chăm sóc', 'Tư vấn từ xa'],
                'region_all_label' => 'Tất cả',
                'details_label' => 'Xem chi tiết',
                'directions_label' => 'Chỉ đường',
                'call_label' => 'Gọi cửa hàng',
                'booking_label' => 'Đặt lịch',
                'support_cta_label' => 'Nhận tư vấn từ xa',
                'support_cta_url' => '#dat-lich-tu-van',
                'form_name_label' => 'Họ và tên',
                'form_phone_label' => 'Số điện thoại',
                'form_service_label' => 'Dịch vụ quan tâm',
                'form_branch_label' => 'Cửa hàng muốn đến',
                'form_message_label' => 'Điều bạn muốn được tư vấn',
                'form_submit_label' => 'Gửi yêu cầu tư vấn',
                'form_success_message' => 'LADYSTARS đã nhận thông tin và sẽ sớm liên hệ với bạn.',
            ], JSON_UNESCAPED_UNICODE),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $items = [
            ['process', 'Chọn hình thức tư vấn', 'Đặt lịch tại cửa hàng hoặc bắt đầu bằng một cuộc trao đổi từ xa.', 'calendar-days', 1],
            ['process', 'Trao đổi nhu cầu', 'Chuyên viên lắng nghe mong muốn, thói quen và phong cách bạn đang tìm kiếm.', 'messages-square', 2],
            ['process', 'Thử và tinh chỉnh', 'Trải nghiệm sản phẩm, kiểm tra độ vừa vặn và điều chỉnh để đạt cảm giác tự nhiên.', 'sparkles', 3],
            ['process', 'Xác nhận lựa chọn', 'Thống nhất sản phẩm, dịch vụ đi kèm và các thông tin cần thiết trước khi hoàn tất.', 'badge-check', 4],
            ['process', 'Đồng hành sau mua', 'Nhận hướng dẫn sử dụng, chăm sóc và hỗ trợ khi cần trong quá trình trải nghiệm.', 'heart-handshake', 5],
            ['policy', 'Thông tin rõ ràng', 'Sản phẩm, dịch vụ và chi phí được tư vấn minh bạch trước khi xác nhận.', 'badge-check', 1],
            ['policy', 'Hỗ trợ điều chỉnh', 'Đội ngũ đồng hành để sản phẩm phù hợp hơn với nhu cầu sử dụng thực tế.', 'refresh-cw', 2],
            ['policy', 'Tư vấn tận tâm', 'Kênh hỗ trợ luôn sẵn sàng giải đáp trong suốt hành trình sử dụng.', 'headphones', 3],
        ];

        foreach ($items as [$type, $title, $description, $icon, $sortOrder]) {
            DB::table('store_page_items')->insert([
                'store_page_content_id' => $contentId,
                'item_type' => $type,
                'title' => $title,
                'description' => $description,
                'icon' => $icon,
                'sort_order' => $sortOrder,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        DB::table('page_seos')->updateOrInsert(
            ['page_key' => 'he-thong-cua-hang'],
            ['title' => 'Hệ thống cửa hàng | LADYSTARS', 'description' => 'Tìm địa điểm tư vấn LADYSTARS, xem thông tin cửa hàng và đặt lịch trải nghiệm riêng.', 'created_at' => $now, 'updated_at' => $now],
        );
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['public_description', 'opening_hours', 'image_path', 'image_alt', 'latitude', 'longitude', 'booking_url', 'map_url', 'show_on_store_page', 'public_sort_order']);
        });
        Schema::dropIfExists('store_page_items');
        Schema::dropIfExists('store_page_contents');
        DB::table('page_seos')->where('page_key', 'he-thong-cua-hang')->delete();
    }
};
