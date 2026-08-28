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
            'returns_enabled' => 'boolean',
            'return_window_days' => 'integer',
            'exchange_enabled' => 'boolean',
            'exchange_window_days' => 'integer',
            'refund_shipping_on_full_return' => 'boolean',
            'warranty_enabled' => 'boolean',
            'appointments_enabled' => 'boolean',
            'appointment_cancel_before_hours' => 'integer',
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
            'returns_enabled' => true,
            'return_window_days' => 7,
            'exchange_enabled' => true,
            'exchange_window_days' => 7,
            'refund_shipping_on_full_return' => false,
            'warranty_enabled' => true,
            'appointments_enabled' => true,
            'appointment_cancel_before_hours' => 4,
            'store_timezone' => 'Asia/Ho_Chi_Minh',
        ]);
    }
}
