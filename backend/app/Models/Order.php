<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['subtotal' => 'decimal:2', 'discount_amount' => 'decimal:2', 'shipping_fee' => 'decimal:2', 'total_amount' => 'decimal:2', 'cancelled_at' => 'datetime', 'completed_at' => 'datetime', 'expires_at' => 'datetime'];
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
