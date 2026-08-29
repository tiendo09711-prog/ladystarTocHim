<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnItem extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'restockable' => 'boolean', 'unit_refund_amount' => 'decimal:2', 'refund_amount' => 'decimal:2',
            'original_value' => 'decimal:2', 'replacement_value' => 'decimal:2', 'price_difference' => 'decimal:2',
            'restocked_at' => 'datetime', 'replacement_reserved_at' => 'datetime',
            'replacement_released_at' => 'datetime', 'replacement_consumed_at' => 'datetime',
        ];
    }

    public function returnRequest()
    {
        return $this->belongsTo(ReturnRequest::class);
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function replacementVariant()
    {
        return $this->belongsTo(ProductVariant::class, 'replacement_variant_id');
    }
}
