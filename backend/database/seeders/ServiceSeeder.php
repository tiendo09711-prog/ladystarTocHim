<?php

namespace Database\Seeders;

use App\Models\CatalogPageContent;
use App\Models\Branch;
use App\Models\PageSeo;
use App\Models\Service;
use App\Models\StoreSetting;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            ['name' => 'Vệ sinh tóc giả', 'slug' => 've-sinh-toc-gia', 'short_description' => 'Làm sạch tóc và phần đế, hỗ trợ duy trì cảm giác sạch sẽ và dễ chịu khi sử dụng.', 'price' => 100000, 'sort_order' => 10, 'status' => 'active', 'image_alt' => 'Chuyên viên vệ sinh và chăm sóc tóc giả'],
            ['name' => 'Detox da đầu', 'slug' => 'detox-da-dau', 'short_description' => 'Làm sạch da đầu chuyên sâu, hỗ trợ loại bỏ cặn bẩn và mang lại cảm giác thông thoáng.', 'price' => 50000, 'sort_order' => 20, 'status' => 'active', 'image_alt' => 'Liệu trình detox làm sạch da đầu'],
            ['name' => 'Thuê tóc giả', 'slug' => 'thue-toc-gia', 'short_description' => 'Giải pháp tóc linh hoạt cho sự kiện, chụp ảnh hoặc nhu cầu sử dụng trong thời gian ngắn.', 'price' => 500000, 'sort_order' => 30, 'status' => 'active', 'image_alt' => 'Mẫu tóc giả nam được chuẩn bị cho dịch vụ thuê'],
            ['name' => 'Hấp tóc giả', 'slug' => 'hap-toc-gia', 'short_description' => 'Bổ sung độ ẩm và hỗ trợ phục hồi vẻ mềm mại, tự nhiên cho mái tóc sau thời gian sử dụng.', 'price' => 350000, 'sort_order' => 40, 'status' => 'active', 'image_alt' => 'Chăm sóc phục hồi và hấp dưỡng tóc giả'],
            ['name' => 'Nhuộm màu tóc giả', 'slug' => 'nhuom-mau-toc-gia', 'short_description' => 'Điều chỉnh màu tóc hài hòa với phong cách và màu tóc thật theo tư vấn của chuyên viên.', 'price' => 350000, 'sort_order' => 50, 'status' => 'active', 'image_alt' => 'Chuyên viên nhuộm màu tóc giả'],
            ['name' => 'Cắt tóc giả', 'slug' => 'cat-toc-gia', 'short_description' => 'Tạo kiểu và tinh chỉnh độ dài để mái tóc cân đối hơn với gương mặt và phong cách cá nhân.', 'price' => 180000, 'sort_order' => 60, 'status' => 'active', 'image_alt' => 'Chuyên viên cắt và tạo kiểu tóc giả'],
            ['name' => 'Massage cổ vai gáy', 'slug' => 'massage-co-vai-gay', 'short_description' => 'Thư giãn vùng cổ vai gáy trong thời gian chăm sóc tóc tại LADYSTARS.', 'price' => 100000, 'sort_order' => 70, 'status' => 'active', 'image_alt' => 'Dịch vụ massage thư giãn cổ vai gáy'],
        ];

        foreach ($services as $service) {
            Service::withTrashed()->firstOrCreate(['slug' => $service['slug']], $service);
        }

        $store = StoreSetting::current();
        if (blank($store->support_phone)) {
            $supportPhone = Branch::query()->where('is_active', true)->orderByDesc('is_default')->orderBy('id')->value('phone');
            if ($supportPhone) $store->update(['support_phone' => $supportPhone]);
        }

        $content = CatalogPageContent::firstOrCreate(['page_key' => 'hair-guide'], [
            'eyebrow' => 'LADYSTARS CARE',
            'title' => 'Dịch vụ chăm sóc tóc',
            'subtitle' => 'Tận tâm chăm sóc, phục hồi và hoàn thiện mái tóc để bạn luôn tự tin trong từng khoảnh khắc.',
            'hero_image_alt' => 'Không gian chăm sóc tóc tại LADYSTARS',
            'editorial_title' => 'Chăm sóc đúng cách, an tâm sử dụng',
            'editorial_intro' => 'Mỗi dịch vụ được thực hiện theo nhu cầu thực tế và tình trạng của mái tóc.',
            'editorial_sections_json' => [
                ['title' => 'Kiểm tra trước khi thực hiện', 'body' => 'Chuyên viên trao đổi nhu cầu và đánh giá tình trạng tóc trước khi bắt đầu.'],
                ['title' => 'Quy trình rõ ràng', 'body' => 'Chi phí và phạm vi dịch vụ được xác nhận trước với khách hàng.'],
                ['title' => 'Chăm sóc phù hợp', 'body' => 'Phương pháp được lựa chọn theo chất liệu, màu sắc và trạng thái hiện tại của tóc.'],
                ['title' => 'Hướng dẫn sau dịch vụ', 'body' => 'Khách hàng được hướng dẫn bảo quản để duy trì độ bền và vẻ tự nhiên.'],
            ],
            'consultation_title' => 'Cần tư vấn dịch vụ phù hợp?',
            'consultation_body' => 'Để lại thông tin, đội ngũ LADYSTARS sẽ hỗ trợ lựa chọn dịch vụ và xác nhận lịch thuận tiện.',
            'consultation_cta_label' => 'Đăng ký tư vấn',
            'settings_json' => ['guide_grid_title' => 'Danh sách dịch vụ', 'guide_grid_intro' => 'Chọn dịch vụ phù hợp và đặt lịch trực tiếp cùng đội ngũ LADYSTARS.'],
            'is_active' => true,
        ]);
        PageSeo::firstOrCreate(['page_key' => 'hair-guide'], ['title' => 'Dịch vụ chăm sóc tóc | LADYSTARS', 'description' => 'Khám phá và đặt lịch các dịch vụ chăm sóc tóc tại LADYSTARS.']);
        if ($content) {
            $settings = $content->settings_json ?? [];
            if (blank($settings['guide_grid_title'] ?? null) || ($settings['guide_grid_title'] ?? null) === 'Lựa chọn được gợi ý') {
                $settings['guide_grid_title'] = 'Danh sách dịch vụ';
            }
            if (blank($settings['guide_grid_intro'] ?? null) || ($settings['guide_grid_intro'] ?? null) === 'Khám phá các sản phẩm được trình bày để bạn thuận tiện so sánh.') {
                $settings['guide_grid_intro'] = 'Chọn dịch vụ phù hợp và đặt lịch trực tiếp cùng đội ngũ LADYSTARS.';
            }
            $updates = ['settings_json' => $settings];
            if (blank($content->eyebrow)) $updates['eyebrow'] = 'LADYSTARS CARE';
            if (blank($content->title) || $content->title === 'Dịch vụ chăm sóc tóc phù hợp với bạn') $updates['title'] = 'Dịch vụ chăm sóc tóc';
            if (blank($content->subtitle)) $updates['subtitle'] = 'Tận tâm chăm sóc, phục hồi và hoàn thiện mái tóc để bạn luôn tự tin trong từng khoảnh khắc.';
            if (blank($content->hero_image_alt)) $updates['hero_image_alt'] = 'Không gian chăm sóc tóc tại LADYSTARS';
            if (blank($content->editorial_title)) $updates['editorial_title'] = 'Chăm sóc đúng cách, an tâm sử dụng';
            if (blank($content->editorial_intro)) $updates['editorial_intro'] = 'Mỗi dịch vụ được thực hiện theo nhu cầu thực tế và tình trạng của mái tóc.';
            if (blank($content->editorial_sections_json)) $updates['editorial_sections_json'] = [
                ['title' => 'Kiểm tra trước khi thực hiện', 'body' => 'Chuyên viên trao đổi nhu cầu và đánh giá tình trạng tóc trước khi bắt đầu.'],
                ['title' => 'Quy trình rõ ràng', 'body' => 'Chi phí và phạm vi dịch vụ được xác nhận trước với khách hàng.'],
                ['title' => 'Chăm sóc phù hợp', 'body' => 'Phương pháp được lựa chọn theo chất liệu, màu sắc và trạng thái hiện tại của tóc.'],
                ['title' => 'Hướng dẫn sau dịch vụ', 'body' => 'Khách hàng được hướng dẫn bảo quản để duy trì độ bền và vẻ tự nhiên.'],
            ];
            if (blank($content->consultation_title)) $updates['consultation_title'] = 'Cần tư vấn dịch vụ phù hợp?';
            if (blank($content->consultation_body)) $updates['consultation_body'] = 'Để lại thông tin, đội ngũ LADYSTARS sẽ hỗ trợ lựa chọn dịch vụ và xác nhận lịch thuận tiện.';
            if (blank($content->consultation_cta_label)) $updates['consultation_cta_label'] = 'Đăng ký tư vấn';
            $content->update($updates);
        }
    }
}
