<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContentPage extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['content' => 'array', 'is_active' => 'boolean', 'published_at' => 'datetime'];
    }
}
