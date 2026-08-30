<?php

namespace Database\Seeders;

use App\Models\CatalogPageContent;
use App\Models\PageSeo;
use App\Models\Product;
use Illuminate\Database\Seeder;
use LogicException;

class CatalogContentSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('testing')) {
            throw new LogicException('CatalogContentSeeder is restricted to the testing environment.');
        }

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

        $guideProducts = Product::query()->where('status', 'active')->whereHas('variants', fn ($query) => $query->where('status', 'active'))->orderBy('id')->limit(6)->pluck('id')->values();
        CatalogPageContent::firstOrCreate(['page_key' => 'hair-guide'], [
            'eyebrow' => 'LADYSTARS GUIDE',
            'title' => 'Dịch vụ chăm sóc tóc phù hợp với bạn',
            'subtitle' => 'Bắt đầu từ vùng tóc cần quan tâm, cảm giác mong muốn và thói quen sử dụng để so sánh rõ ràng trước khi quyết định.',
            'hero_image_alt' => 'Tư vấn lựa chọn tóc LADYSTARS',
            'editorial_title' => 'Các tiêu chí lựa chọn',
            'editorial_intro' => 'Mỗi lựa chọn được trình bày rõ ràng để bạn dễ cân nhắc theo nhu cầu thực tế.',
            'editorial_sections_json' => [
                ['title' => 'Xác định nhu cầu', 'body' => 'Bắt đầu từ vùng tóc cần quan tâm và mức độ che phủ bạn mong muốn.'],
                ['title' => 'Ưu tiên cảm giác', 'body' => 'Cân nhắc độ nhẹ, độ thoáng và thời gian sử dụng phù hợp với sinh hoạt hằng ngày.'],
                ['title' => 'Chọn kiểu hoàn thiện', 'body' => 'So sánh màu tóc, chất liệu và kiểu tạo hình để tìm phong cách hài hòa.'],
                ['title' => 'Nhận tư vấn riêng', 'body' => 'Đội ngũ LADYSTARS có thể hỗ trợ bạn đối chiếu các lựa chọn trước khi quyết định.'],
            ],
            'consultation_title' => 'Cần thêm một gợi ý phù hợp?',
            'consultation_body' => 'Để lại thông tin, đội ngũ LADYSTARS sẽ hỗ trợ bạn tìm lựa chọn phù hợp với nhu cầu.',
            'consultation_image_alt' => 'Không gian tư vấn LADYSTARS',
            'consultation_cta_label' => 'Gửi yêu cầu tư vấn',
            'settings_json' => [
                'hero_badge' => 'Lựa chọn rõ ràng, tự tin hơn',
                'trust_items' => [
                    ['title' => 'Thông tin rõ ràng', 'description' => 'So sánh dựa trên dữ liệu sản phẩm thực tế.'],
                    ['title' => 'Chọn theo nhu cầu', 'description' => 'Gợi ý theo thói quen và cảm giác mong muốn.'],
                    ['title' => 'Tư vấn tận tâm', 'description' => 'Hỗ trợ khi bạn cần trao đổi kỹ hơn.'],
                ],
                'guide_grid_title' => 'Lựa chọn được gợi ý',
                'guide_grid_intro' => 'Khám phá các sản phẩm được trình bày để bạn thuận tiện so sánh.',
                'guide_products' => $guideProducts->map(fn (int $id, int $index) => ['product_id' => $id, 'badge' => $index === 0 ? 'Phù hợp sử dụng hằng ngày' : null, 'note' => null])->all(),
                'product_primary_cta_label' => 'Xem chi tiết',
                'product_secondary_cta_label' => 'Nhận tư vấn',
                'consultation_benefits' => ['Gợi ý theo nhu cầu', 'Thông tin sản phẩm minh bạch'],
            ],
            'is_active' => true,
        ]);
        PageSeo::firstOrCreate(['page_key' => 'hair-guide'], ['title' => 'Dịch vụ chăm sóc tóc | LADYSTARS', 'description' => 'Khám phá dịch vụ chăm sóc tóc phù hợp với nhu cầu và thói quen sử dụng của bạn.']);
    }
}
