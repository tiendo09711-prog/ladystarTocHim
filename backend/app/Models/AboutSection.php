<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AboutSection extends Model
{
    protected $guarded = [];

    public const TYPES = ['hero', 'rich_text_image', 'timeline', 'showcase', 'cards', 'goals', 'testimonials', 'cta'];

    public const ICONS = ['heart', 'sparkles', 'gem', 'shield-check', 'leaf', 'scissors', 'star', 'users', 'compass', 'hand-heart', 'messages-square', 'badge-check'];

    protected function casts(): array
    {
        return [
            'settings_json' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function scopePublished($query)
    {
        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()));
    }
}
