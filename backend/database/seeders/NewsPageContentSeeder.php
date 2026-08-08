<?php

namespace Database\Seeders;

use App\Models\NewsPageContent;
use App\Models\PageSeo;
use Illuminate\Database\Seeder;

class NewsPageContentSeeder extends Seeder
{
    public function run(): void
    {
        NewsPageContent::firstOrCreate(['page_key' => 'news'], [
            'eyebrow' => 'TIN TỨC & CẨM NANG',
            'title' => 'Bản tin LADYSTARS',
            'description' => 'Cẩm nang lựa chọn và chăm sóc tóc, câu chuyện thương hiệu cùng những cập nhật mới nhất từ LADYSTARS.',
            'featured_badge_label' => 'Bài viết nổi bật',
            'list_eyebrow' => 'KHÁM PHÁ LADYSTARS',
            'list_title' => 'Bài viết mới nhất',
            'list_description' => 'Những chia sẻ giúp bạn lựa chọn, sử dụng và chăm sóc mái tóc tự tin hơn mỗi ngày.',
            'show_cta' => true,
            'cta_eyebrow' => 'ĐỒNG HÀNH CÙNG LADYSTARS',
            'cta_title' => 'Bạn cần một lựa chọn phù hợp hơn với chính mình?',
            'cta_description' => 'Đội ngũ LADYSTARS luôn sẵn sàng lắng nghe và tư vấn theo nhu cầu, phong cách và thói quen sử dụng của bạn.',
            'cta_primary_label' => 'Nhận tư vấn riêng',
            'cta_primary_url' => '/lien-he',
            'cta_secondary_label' => 'Khám phá sản phẩm',
            'cta_secondary_url' => '/san-pham',
        ]);

        PageSeo::firstOrCreate(['page_key' => 'tin-tuc'], [
            'title' => 'Bản tin LADYSTARS',
            'description' => 'Cẩm nang lựa chọn và chăm sóc tóc, câu chuyện thương hiệu cùng những cập nhật mới nhất từ LADYSTARS.',
        ]);
    }
}
