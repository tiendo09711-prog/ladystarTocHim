<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WarrantyRequest extends Model
{
    public const ACTIVE_STATUSES = ['requested', 'reviewing', 'approved', 'received', 'processing', 'ready'];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime', 'reviewed_at' => 'datetime', 'approved_at' => 'datetime', 'received_at' => 'datetime',
            'completed_at' => 'datetime', 'cancelled_at' => 'datetime', 'replacement_reserved_at' => 'datetime',
            'replacement_released_at' => 'datetime', 'replacement_consumed_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function replacementVariant()
    {
        return $this->belongsTo(ProductVariant::class, 'replacement_variant_id');
    }

    public function receivingBranch()
    {
        return $this->belongsTo(Branch::class, 'receiving_branch_id');
    }

    public function media()
    {
        return $this->morphMany(AfterSalesMedium::class, 'mediable')->orderBy('sort_order');
    }

    public function shipments()
    {
        return $this->hasMany(AfterSalesShipment::class);
    }
}
