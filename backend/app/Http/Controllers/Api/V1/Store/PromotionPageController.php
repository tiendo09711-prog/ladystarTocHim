<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\NewsArticle;
use App\Models\NewsPageContent;
use App\Models\PageSeo;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PromotionPageController extends Controller
{
    use ApiResponse;

    private const PAGE_KEY = 'promotions';
    private const SEO_KEY = 'uu-dai';
    private const CATEGORY = 'Ưu đãi';

    private const CONTENT_FIELDS = [
        'eyebrow', 'title', 'description', 'featured_badge_label', 'list_eyebrow', 'list_title', 'list_description',
        'cta_eyebrow', 'cta_title', 'cta_description', 'cta_primary_label', 'cta_primary_url', 'cta_secondary_label',
        'cta_secondary_url',
    ];

    public function index(Request $request)
    {
        $content = NewsPageContent::where('page_key', self::PAGE_KEY)->first();
        $featured = $this->resolveFeatured($content);
        $articles = NewsArticle::activePromotion()
            ->when($featured, fn ($query) => $query->where('id', '!=', $featured->id))
            ->orderByDesc('published_at')
            ->orderBy('sort_order')
            ->paginate(9, ['id', 'title', 'slug', 'excerpt', 'cover_image_path', 'cover_image_alt', 'category', 'published_at', 'promotion_badge', 'promotion_conditions', 'promotion_starts_at', 'promotion_ends_at']);

        $seo = PageSeo::where('page_key', self::SEO_KEY)->first(['title', 'description', 'og_image_path']);

        return $this->success([
            'content' => $this->contentPayload($content),
            'seo' => $seo,
            'featured' => $featured ? $this->articleSummary($featured) : null,
            'articles' => $articles,
        ]);
    }

    public function show(string $slug)
    {
        $article = NewsArticle::activePromotion()
            ->with(['author:id,name', 'products' => fn ($query) => $query->where('status', 'active')->with('images', 'variants.inventories')])
            ->where('slug', $slug)
            ->firstOrFail();

        $payload = $article->toArray();
        $payload['products'] = $article->products->map(fn ($product) => [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'base_sku' => $product->base_sku,
            'short_description' => $product->short_description,
            'image_path' => $this->assetUrl($product->images->sortByDesc('is_primary')->first()?->image_path),
            'price_min' => (float) ($product->variants->min(fn ($variant) => $variant->currentPrice()) ?? 0),
            'available_stock' => (int) $product->variants->sum(fn ($variant) => $variant->availableStock()),
        ])->values();

        return $this->success($payload);
    }

    private function resolveFeatured(?NewsPageContent $content): ?NewsArticle
    {
        $featured = $content?->featuredArticle;
        if ($featured && $this->isPublishedPromotion($featured)) {
            return $featured;
        }

        return NewsArticle::activePromotion()
            ->orderByDesc('published_at')
            ->orderBy('sort_order')
            ->first();
    }

    private function contentPayload(?NewsPageContent $content): array
    {
        $payload = [];
        foreach (self::CONTENT_FIELDS as $key) {
            $payload[$key] = $content?->{$key};
        }

        return [
            'id' => $content?->id,
            'page_key' => self::PAGE_KEY,
            ...$payload,
            'show_cta' => (bool) ($content?->show_cta ?? false),
            'featured_article_id' => $content?->featured_article_id,
            'cta_image_path' => $this->assetUrl($content?->cta_image_path),
            'cta_image_alt' => $content?->cta_image_alt,
        ];
    }

    private function articleSummary(NewsArticle $article): array
    {
        return [
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'excerpt' => $article->excerpt,
            'cover_image_path' => $article->cover_image_path,
            'cover_image_alt' => $article->cover_image_alt,
            'category' => $article->category,
            'published_at' => $article->published_at,
            'promotion_badge' => $article->promotion_badge,
            'promotion_conditions' => $article->promotion_conditions,
            'promotion_starts_at' => $article->promotion_starts_at,
            'promotion_ends_at' => $article->promotion_ends_at,
            'has_cover' => filled($article->cover_image_path),
        ];
    }

    private function isPublishedPromotion(NewsArticle $article): bool
    {
        return NewsArticle::activePromotion()->whereKey($article->id)->exists();
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path || str_starts_with($path, '/') || preg_match('/^https?:\/\//', $path)) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}
