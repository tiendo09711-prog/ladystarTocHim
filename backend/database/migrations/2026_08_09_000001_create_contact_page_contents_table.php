<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_page_contents', function (Blueprint $table) {
            $table->id();
            $table->string('page_key', 60)->unique()->default('contact');
            $table->string('hero_eyebrow', 120)->nullable();
            $table->string('hero_title', 190)->nullable();
            $table->text('hero_description')->nullable();
            $table->string('hero_image_path')->nullable();
            $table->string('hero_image_alt', 190)->nullable();
            $table->string('contact_eyebrow', 120)->nullable();
            $table->string('contact_title', 190)->nullable();
            $table->text('contact_description')->nullable();
            $table->string('commitments_eyebrow', 120)->nullable();
            $table->string('commitments_title', 190)->nullable();
            $table->text('commitments_description')->nullable();
            $table->string('guide_eyebrow', 120)->nullable();
            $table->string('guide_title', 190)->nullable();
            $table->text('guide_description')->nullable();
            $table->string('guide_image_path')->nullable();
            $table->string('guide_image_alt', 190)->nullable();
            $table->text('guide_quote')->nullable();
            $table->string('branches_eyebrow', 120)->nullable();
            $table->string('branches_title', 190)->nullable();
            $table->text('branches_description')->nullable();
            $table->string('form_eyebrow', 120)->nullable();
            $table->string('form_title', 190)->nullable();
            $table->text('form_description')->nullable();
            $table->json('settings_json')->nullable();
            $table->timestamps();
        });

        Schema::table('consultation_requests', function (Blueprint $table) {
            $table->string('service_name', 190)->nullable()->after('category_id');
            $table->foreignId('branch_id')->nullable()->after('service_name')->constrained()->nullOnDelete();
        });

        $now = now();
        DB::table('contact_page_contents')->insert([
            'page_key' => 'contact',
            'hero_eyebrow' => 'KẾT NỐI CÙNG LADYSTARS',
            'hero_title' => 'Mỗi lựa chọn đẹp bắt đầu từ một cuộc trò chuyện',
            'hero_description' => 'Chia sẻ điều bạn đang quan tâm, đội ngũ LADYSTARS sẽ lắng nghe và cùng bạn tìm giải pháp phù hợp theo cách riêng tư, rõ ràng và nhẹ nhàng.',
            'hero_image_path' => '/images/brand/ladystars-hero.svg',
            'hero_image_alt' => 'Không gian tư vấn của LADYSTARS',
            'contact_eyebrow' => 'THÔNG TIN LIÊN HỆ',
            'contact_title' => 'Chúng tôi luôn ở đây khi bạn cần',
            'contact_description' => 'Liên hệ trực tiếp hoặc chọn một địa điểm thuận tiện. Các thông tin bên dưới được đồng bộ từ cấu hình cửa hàng và hệ thống chi nhánh.',
            'commitments_eyebrow' => 'TRẢI NGHIỆM AN TÂM',
            'commitments_title' => 'Sự chỉn chu trong từng điểm chạm',
            'commitments_description' => 'Từ lần trao đổi đầu tiên đến quá trình đồng hành sau đó, mọi trải nghiệm đều hướng đến sự thoải mái và minh bạch.',
            'guide_eyebrow' => 'HƯỚNG DẪN NHẬN DIỆN',
            'guide_title' => 'Kết nối đúng kênh, nhận hỗ trợ đúng chuẩn',
            'guide_description' => 'Một vài lưu ý đơn giản giúp bạn chủ động xác minh thông tin trước khi ghé thăm hoặc đặt lịch.',
            'guide_image_path' => '/images/brand/ladystars-hero.svg',
            'guide_image_alt' => 'Nhận diện không gian và kênh liên hệ LADYSTARS',
            'guide_quote' => 'Cảm ơn bạn đã tin tưởng. LADYSTARS trân trọng mọi chia sẻ và luôn ưu tiên sự riêng tư trong quá trình tư vấn.',
            'branches_eyebrow' => 'ĐỊA ĐIỂM TƯ VẤN',
            'branches_title' => 'Chọn không gian gần bạn',
            'branches_description' => 'Danh sách này được đồng bộ trực tiếp từ phần quản lý chi nhánh.',
            'form_eyebrow' => 'ĐẶT LỊCH TƯ VẤN',
            'form_title' => 'Để lại thông tin, chúng tôi sẽ liên hệ với bạn',
            'form_description' => 'Bạn chỉ cần cung cấp những thông tin cần thiết. Đội ngũ tư vấn sẽ chủ động kết nối trong thời gian phù hợp.',
            'settings_json' => json_encode([
                'hero_primary_label' => 'Gửi yêu cầu tư vấn',
                'hero_primary_url' => '#form-lien-he',
                'hero_secondary_label' => 'Xem hệ thống cửa hàng',
                'hero_secondary_url' => '/he-thong-cua-hang',
                'hotline_label' => 'Hotline tư vấn',
                'email_label' => 'Email hỗ trợ',
                'hours_label' => 'Thời gian phục vụ',
                'hours_value' => '08:00 – 20:00 mỗi ngày',
                'branch_call_label' => 'Gọi cửa hàng',
                'branch_directions_label' => 'Chỉ đường',
                'form_name_label' => 'Họ và tên',
                'form_phone_label' => 'Số điện thoại',
                'form_service_label' => 'Dịch vụ bạn quan tâm',
                'form_branch_label' => 'Địa điểm thuận tiện',
                'form_message_label' => 'Chia sẻ thêm với chúng tôi',
                'form_submit_label' => 'Gửi yêu cầu tư vấn',
                'form_success_message' => 'Cảm ơn bạn. Yêu cầu tư vấn đã được ghi nhận.',
                'privacy_note' => 'Thông tin của bạn chỉ được dùng để phản hồi yêu cầu tư vấn.',
                'services' => ['Tư vấn chọn sản phẩm', 'Đặt lịch trải nghiệm', 'Chăm sóc và bảo dưỡng', 'Hỗ trợ sau mua'],
                'commitments' => [
                    ['icon' => 'sparkles', 'title' => 'Tư vấn theo nhu cầu', 'description' => 'Lắng nghe mong muốn thực tế trước khi đưa ra gợi ý.'],
                    ['icon' => 'heart-handshake', 'title' => 'Không gian riêng tư', 'description' => 'Trao đổi nhẹ nhàng, tôn trọng cảm xúc và sự thoải mái của bạn.'],
                    ['icon' => 'shield-check', 'title' => 'Thông tin minh bạch', 'description' => 'Giải thích rõ sản phẩm, quy trình và chính sách liên quan.'],
                ],
                'guide_points' => [
                    'Ưu tiên thông tin hotline, email và địa chỉ đang hiển thị trên website chính thức.',
                    'Đối chiếu tên chi nhánh và số điện thoại trước khi đặt lịch hoặc di chuyển.',
                    'Không chia sẻ mật khẩu, mã xác thực hoặc thông tin thanh toán qua tin nhắn tư vấn.',
                    'Khi cần kiểm tra thêm, hãy liên hệ hotline chung để được xác nhận.',
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('page_seos')->updateOrInsert(
            ['page_key' => 'lien-he'],
            [
                'title' => 'Liên hệ | LADYSTARS',
                'description' => 'Kết nối với LADYSTARS, xem thông tin chi nhánh và gửi yêu cầu tư vấn.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
    }

    public function down(): void
    {
        DB::table('page_seos')->where('page_key', 'lien-he')->delete();
        Schema::table('consultation_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id');
            $table->dropColumn('service_name');
        });
        Schema::dropIfExists('contact_page_contents');
    }
};
