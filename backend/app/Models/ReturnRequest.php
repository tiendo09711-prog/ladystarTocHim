<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnRequest extends Model
{
    public const ACTIVE_STATUSES = ['requested', 'reviewing', 'approved', 'returning', 'received', 'completed'];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime', 'reviewed_at' => 'datetime', 'approved_at' => 'datetime',
            'rejected_at' => 'datetime', 'received_at' => 'datetime', 'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function receivingBranch()
    {
        return $this->belongsTo(Branch::class, 'receiving_branch_id');
    }

    public function items()
    {
        return $this->hasMany(ReturnItem::class);
    }

    public function media()
    {
        return $this->morphMany(AfterSalesMedium::class, 'mediable')->orderBy('sort_order');
    }

    public function shipments()
    {
        return $this->hasMany(AfterSalesShipment::class);
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }
}
