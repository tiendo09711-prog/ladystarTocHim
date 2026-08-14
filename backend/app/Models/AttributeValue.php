<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class AttributeValue extends Model
{
    protected $guarded = [];

    protected $appends = ['image_url'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'is_active' => 'boolean'];
    }

    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image_path) return null;

        return str_starts_with($this->image_path, '/') || str_starts_with($this->image_path, 'http')
            ? $this->image_path
            : Storage::disk('public')->url($this->image_path);
    }

    public function attribute()
    {
        return $this->belongsTo(Attribute::class);
    }

    public function variants()
    {
        return $this->belongsToMany(ProductVariant::class, 'product_variant_attribute_values')->withPivot('attribute_id');
    }
}
