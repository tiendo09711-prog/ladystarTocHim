<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attribute extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['is_filterable' => 'boolean', 'is_variant_attribute' => 'boolean', 'is_active' => 'boolean'];
    }

    public function values()
    {
        return $this->hasMany(AttributeValue::class);
    }
}
