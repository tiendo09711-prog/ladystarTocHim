<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreSetting extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'shipping_fee' => 'decimal:2',
            'free_shipping_from' => 'decimal:2',
            'low_stock_threshold' => 'integer',
            'bank_transfer_enabled' => 'boolean',
        ];
    }

    public static function current(): self
    {
        return self::firstOrCreate([], [
            'store_name' => config('app.store_name', 'LADYSTARS'),
            'currency' => 'VND',
            'shipping_fee' => 30000,
            'free_shipping_from' => 1000000,
            'low_stock_threshold' => 3,
            'order_prefix' => 'NH',
            'bank_transfer_enabled' => true,
        ]);
    }
}
