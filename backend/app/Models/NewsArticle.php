<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class NewsArticle extends Model
{
    protected $guarded = [];

    public const STATUSES = ['draft', 'published', 'archived'];
    public const TYPE_NEWS = 'news';
    public const TYPE_PROMOTION = 'promotion';
    public const TYPE_GUIDE = 'guide';
    public const TYPES = [self::TYPE_NEWS, self::TYPE_PROMOTION, self::TYPE_GUIDE];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'promotion_starts_at' => 'datetime',
            'promotion_ends_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class);
    }

    public function scopeActivePromotion($query)
    {
        return $query->published()
            ->where('content_type', self::TYPE_PROMOTION)
            ->whereHas('products', fn ($products) => $products->where('status', 'active'))
            ->where(fn ($nested) => $nested->whereNull('promotion_starts_at')->orWhere('promotion_starts_at', '<=', now()))
            ->where(fn ($nested) => $nested->whereNull('promotion_ends_at')->orWhere('promotion_ends_at', '>=', now()));
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', now()));
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('content_type', $type);
    }
}
