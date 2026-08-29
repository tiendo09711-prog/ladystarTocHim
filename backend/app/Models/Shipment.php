<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['shipping_fee_actual' => 'decimal:2', 'shipped_at' => 'datetime', 'delivered_at' => 'datetime', 'failed_at' => 'datetime', 'returned_at' => 'datetime'];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
