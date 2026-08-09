<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StorePageContent extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['settings_json' => 'array'];
    }

    public function items(): HasMany
    {
        return $this->hasMany(StorePageItem::class);
    }
}
