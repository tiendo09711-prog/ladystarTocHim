<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CatalogPageContent extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'editorial_sections_json' => 'array',
            'settings_json' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
