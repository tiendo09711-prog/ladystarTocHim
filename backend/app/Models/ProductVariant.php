<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['price' => 'decimal:2', 'sale_price' => 'decimal:2'];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function attributeValues()
    {
        return $this->belongsToMany(AttributeValue::class, 'product_variant_attribute_values')->withPivot('attribute_id');
    }

    public function inventories()
    {
        return $this->hasMany(Inventory::class);
    }

    public function currentPrice(): float
    {
        return (float) ($this->sale_price ?? $this->price);
    }

    public function availableStock(): int
    {
        return (int) $this->inventories->sum(fn (Inventory $inventory) => $inventory->quantity_on_hand - $inventory->quantity_reserved);
    }
}
