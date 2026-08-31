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
            'hair_finder_config' => 'array',
        ];
    }

    public static function current(): self
    {
        return self::query()->firstOrCreate([], [
            'store_name' => '',
            'currency' => '',
            'shipping_fee' => 0,
            'free_shipping_from' => 0,
            'low_stock_threshold' => 0,
            'order_prefix' => '',
            'bank_transfer_enabled' => false,
            'returns_enabled' => false,
            'return_window_days' => 0,
            'exchange_enabled' => false,
            'exchange_window_days' => 0,
            'refund_shipping_on_full_return' => false,
            'warranty_enabled' => false,
            'appointments_enabled' => false,
            'appointment_cancel_before_hours' => 0,
            'store_timezone' => null,
        ]);
    }

    public function isConfigured(): bool
    {
        return $this->exists && filled($this->store_name) && filled($this->order_prefix) && filled($this->currency) && filled($this->store_timezone);
    }
}
