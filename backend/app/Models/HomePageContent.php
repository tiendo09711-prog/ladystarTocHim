<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomePageContent extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'announcement_messages' => 'array',
            'announcement_interval_seconds' => 'integer',
            'announcement_enabled' => 'boolean',
        ];
    }

    public static function current(): self
    {
        return self::firstOrCreate(['page_key' => 'home'], [
            'announcement_messages' => [
                'Miễn phí giao hàng cho đơn từ 1.000.000đ',
                'Tư vấn lựa chọn theo phong cách riêng',
            ],
            'announcement_interval_seconds' => 5,
            'announcement_enabled' => true,
        ]);
    }
}
