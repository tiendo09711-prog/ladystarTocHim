<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AfterSalesShipment extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['shipping_fee_actual' => 'decimal:2', 'shipped_at' => 'datetime', 'delivered_at' => 'datetime'];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function returnRequest()
    {
        return $this->belongsTo(ReturnRequest::class);
    }

    public function warrantyRequest()
    {
        return $this->belongsTo(WarrantyRequest::class);
    }
}
