<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NewsPageContent extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'show_cta' => 'boolean',
        ];
    }

    public function featuredArticle(): BelongsTo
    {
        return $this->belongsTo(NewsArticle::class, 'featured_article_id');
    }
}
