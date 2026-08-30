<?php

namespace Database\Seeders;

use App\Models\StoreSetting;
use Illuminate\Database\Seeder;

class HairFinderConfigSeeder extends Seeder
{
    public function run(): void
    {
        StoreSetting::current()->update(['hair_finder_config' => [
            'content' => [
                'eyebrow' => 'LADYSTARS Hair Finder',
                'title' => 'Tìm mẫu tóc phù hợp với bạn',
                'description' => 'Gợi ý dựa trên dữ liệu sản phẩm và cấu hình tư vấn đang áp dụng.',
                'result_title' => 'Gợi ý dành cho bạn',
                'empty_result' => 'Chưa có sản phẩm khả dụng phù hợp với lựa chọn này.',
                'score_template' => ':score% phù hợp',
            ],
            'format' => ['locale' => 'vi-VN', 'currency' => 'VND'],
            'actions' => [
                'back' => 'Quay lại',
                'next' => 'Tiếp tục',
                'submit' => 'Xem gợi ý',
                'loading' => 'Đang phân tích...',
                'restart' => 'Làm lại',
            ],
            'questions' => [
                [
                    'key' => 'usage',
                    'type' => 'single',
                    'title' => 'Bạn muốn sử dụng tóc cho nhu cầu nào?',
                    'default_value' => 'daily',
                    'choices' => [
                        ['value' => 'daily', 'label' => 'Sử dụng hàng ngày'],
                        ['value' => 'event', 'label' => 'Đi sự kiện'],
                        ['value' => 'style_change', 'label' => 'Thay đổi phong cách'],
                        ['value' => 'natural', 'label' => 'Ưu tiên tự nhiên'],
                    ],
                ],
                [
                    'key' => 'length',
                    'type' => 'single',
                    'title' => 'Độ dài bạn mong muốn?',
                    'default_value' => '',
                    'choices' => [
                        ['value' => 'short', 'label' => 'Ngắn'],
                        ['value' => 'medium', 'label' => 'Trung bình'],
                        ['value' => 'long', 'label' => 'Dài'],
                        ['value' => '', 'label' => 'Chưa xác định'],
                    ],
                ],
                [
                    'key' => 'preferences',
                    'type' => 'multiple',
                    'title' => 'Điều gì quan trọng với bạn?',
                    'default_value' => [],
                    'choices' => [
                        ['value' => 'natural', 'label' => 'Tự nhiên'],
                        ['value' => 'lightweight', 'label' => 'Nhẹ'],
                        ['value' => 'easy_care', 'label' => 'Dễ chăm sóc'],
                        ['value' => 'durable', 'label' => 'Độ bền'],
                        ['value' => 'value', 'label' => 'Giá hợp lý'],
                    ],
                ],
                [
                    'key' => 'budget',
                    'type' => 'budget',
                    'title' => 'Khoảng giá phù hợp?',
                    'default_value' => '',
                    'empty_label' => 'Chưa xác định',
                ],
                [
                    'key' => 'product_fields',
                    'type' => 'select_group',
                    'title' => 'Chất liệu và kiểu đế',
                    'fields' => [
                        ['key' => 'material', 'label' => 'Chất liệu', 'placeholder' => 'Hãy đề xuất', 'source' => 'material'],
                        ['key' => 'base_type', 'label' => 'Kiểu đế', 'placeholder' => 'Hãy đề xuất', 'source' => 'base_type'],
                    ],
                ],
            ],
            'budget' => [
                'labels' => ['Tiết kiệm', 'Cân bằng', 'Cao cấp'],
                'minimum_step' => 500000,
                'rounding_step' => 100000,
            ],
            'scoring' => [
                'base' => ['weight' => 20, 'reason' => 'Sản phẩm đang có phân loại khả dụng.'],
                'budget' => ['weight' => 30, 'reason' => 'Phù hợp với mức giá bạn chọn.'],
                'field_matches' => [
                    'material' => ['weight' => 15, 'reason' => 'Chất liệu trùng với lựa chọn của bạn.'],
                    'base_type' => ['weight' => 15, 'reason' => 'Kiểu đế tóc phù hợp với lựa chọn.'],
                ],
                'length' => [
                    'weight' => 15,
                    'reason' => 'Có phân loại độ dài phù hợp.',
                    'attribute_codes' => ['length', 'chieu-dai'],
                    'choices' => [
                        'short' => ['min_cm' => 0, 'max_cm' => 30, 'keywords' => ['ngắn', 'short']],
                        'medium' => ['min_cm' => 31, 'max_cm' => 50, 'keywords' => ['trung bình', 'medium']],
                        'long' => ['min_cm' => 51, 'max_cm' => null, 'keywords' => ['dài', 'long']],
                    ],
                ],
                'choice_rules' => [
                    'usage' => [
                        'daily' => ['weight' => 5, 'matcher' => 'keywords', 'fields' => ['name', 'short_description', 'description', 'usage_instructions', 'care_instructions'], 'keywords' => ['hàng ngày', 'daily', 'dễ sử dụng'], 'reason' => 'Phù hợp nhu cầu sử dụng hàng ngày.'],
                        'event' => ['weight' => 5, 'matcher' => 'keywords', 'fields' => ['name', 'short_description', 'description'], 'keywords' => ['sự kiện', 'event', 'phong cách'], 'reason' => 'Phù hợp nhu cầu sử dụng cho sự kiện.'],
                        'style_change' => ['weight' => 5, 'matcher' => 'keywords', 'fields' => ['name', 'short_description', 'description'], 'keywords' => ['phong cách', 'style', 'tạo kiểu'], 'reason' => 'Phù hợp nhu cầu thay đổi phong cách.'],
                        'natural' => ['weight' => 5, 'matcher' => 'keywords', 'fields' => ['name', 'short_description', 'description', 'material', 'base_type'], 'keywords' => ['natural', 'tự nhiên'], 'reason' => 'Phù hợp ưu tiên vẻ tự nhiên.'],
                    ],
                    'preferences' => [
                        'natural' => ['weight' => 5, 'matcher' => 'keywords', 'fields' => ['name', 'short_description', 'description', 'material', 'base_type'], 'keywords' => ['natural', 'tự nhiên'], 'reason' => 'Thông tin sản phẩm phù hợp ưu tiên vẻ tự nhiên.'],
                        'lightweight' => ['weight' => 5, 'matcher' => 'keywords', 'fields' => ['name', 'short_description', 'description', 'base_type'], 'keywords' => ['nhẹ', 'light'], 'reason' => 'Thông tin sản phẩm phù hợp ưu tiên nhẹ.'],
                        'easy_care' => ['weight' => 5, 'matcher' => 'fields_or_keywords', 'fields' => ['care_instructions'], 'keywords' => ['dễ chăm', 'easy care'], 'reason' => 'Có hướng dẫn chăm sóc rõ ràng.'],
                        'durable' => ['weight' => 5, 'matcher' => 'fields_present', 'fields' => ['estimated_lifespan', 'warranty_information', 'warranty_days'], 'reason' => 'Có thông tin độ bền hoặc bảo hành.'],
                        'value' => ['weight' => 5, 'matcher' => 'sale_price', 'reason' => 'Giá hiện tại phù hợp ưu tiên chi phí.'],
                    ],
                ],
                'rating' => ['max_bonus' => 5],
                'max_score' => 100,
                'result_limit' => 5,
            ],
        ]]);
    }
}
