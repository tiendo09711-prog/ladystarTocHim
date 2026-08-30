<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['variant_snapshot' => 'array', 'warranty_days_snapshot' => 'integer', 'cost_price_snapshot' => 'decimal:2'];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function review()
    {
        return $this->hasOne(Review::class);
    }

    public function returnItems()
    {
        return $this->hasMany(ReturnItem::class);
    }

    public function warrantyRequests()
    {
        return $this->hasMany(WarrantyRequest::class);
    }
}
