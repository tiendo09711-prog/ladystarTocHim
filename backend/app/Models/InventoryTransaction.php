<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryTransaction extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

}
