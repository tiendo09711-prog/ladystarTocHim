<?php

namespace Database\Seeders;

use App\Models\CatalogPageContent;
use App\Models\PageSeo;
use Illuminate\Database\Seeder;

class CatalogContentSeeder extends Seeder
{
    public function run(): void
    {
        CatalogPageContent::firstOrCreate(['page_key' => 'products'], [
            'eyebrow' => 'Bộ sưu tập LADYSTARS',
            'title' => 'Sản phẩm LADYSTARS',
            'subtitle' => 'Khám phá những lựa chọn tóc tinh tế, thoải mái và phù hợp với phong cách riêng của bạn.',
            'editorial_title' => 'Chọn mái tóc phù hợp với bạn',
            'editorial_intro' => 'LADYSTARS ưu tiên sự tự nhiên, cảm giác dễ chịu và thông tin minh bạch để bạn an tâm lựa chọn.',
            'editorial_sections_json' => [
                ['title' => 'Tư vấn theo nhu cầu', 'body' => 'Đội ngũ LADYSTARS hỗ trợ xác định kiểu tóc, chất liệu và cách chăm sóc phù hợp.'],
                ['title' => 'Thông tin rõ ràng', 'body' => 'Giá, tồn kho và các lựa chọn biến thể được hiển thị từ dữ liệu thực tế.'],
            ],
            'consultation_title' => 'Nhận tư vấn riêng cùng LADYSTARS',
            'consultation_body' => 'Để lại thông tin để đội ngũ hỗ trợ bạn chọn sản phẩm phù hợp nhất.',
            'consultation_cta_label' => 'Gửi yêu cầu tư vấn',
            'settings_json' => ['trust_items' => [['title' => 'Tư vấn tận tâm'], ['title' => 'Thông tin minh bạch'], ['title' => 'Giao hàng cẩn thận']], 'consultation_benefits' => ['Tư vấn theo nhu cầu', 'Hẹn lịch linh hoạt']],
            'is_active' => true,
        ]);
        PageSeo::firstOrCreate(['page_key' => 'products'], ['title' => 'Sản phẩm LADYSTARS', 'description' => 'Khám phá các sản phẩm tóc và giải pháp chăm sóc từ LADYSTARS.']);
    }
}
