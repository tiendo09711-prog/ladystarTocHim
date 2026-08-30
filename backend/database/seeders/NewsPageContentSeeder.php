<?php

namespace Database\Seeders;

use App\Models\NewsPageContent;
use App\Models\PageSeo;
use Illuminate\Database\Seeder;
use LogicException;

class NewsPageContentSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('testing')) {
            throw new LogicException('NewsPageContentSeeder is restricted to the testing environment.');
        }

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

        NewsPageContent::firstOrCreate(['page_key' => 'guides'], [
            'eyebrow' => 'CẨM NANG LADYSTARS',
            'title' => 'Hướng dẫn chăm sóc và tạo kiểu',
            'description' => 'Những chia sẻ thực tế giúp bạn sử dụng, chăm sóc và giữ mái tóc luôn tự nhiên, mềm mại.',
            'featured_badge_label' => 'Hướng dẫn nổi bật',
            'list_eyebrow' => 'KIẾN THỨC HỮU ÍCH',
            'list_title' => 'Khám phá các bài hướng dẫn',
            'list_description' => 'Nội dung chỉ xuất hiện sau khi được tạo và xuất bản từ khu vực quản trị.',
            'show_cta' => false,
        ]);

        PageSeo::firstOrCreate(['page_key' => 'huong-dan'], [
            'title' => 'Hướng dẫn | LADYSTARS',
            'description' => 'Cẩm nang chăm sóc, sử dụng và tạo kiểu tóc từ LADYSTARS.',
        ]);
    }
}
