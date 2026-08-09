<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\NewsArticle;
use App\Models\NewsPageContent;
use App\Models\PageSeo;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class GuidePageController extends Controller
{
    use ApiResponse;

    private const PAGE_KEY = 'guides';
    private const SEO_KEY = 'huong-dan';
    private const CATEGORY = 'Hướng dẫn';

    public function index(Request $request)
    {
        $content = NewsPageContent::where('page_key', self::PAGE_KEY)->first();
        $featured = $this->resolveFeatured($content);
        $articles = NewsArticle::published()
            ->where('category', self::CATEGORY)
            ->when($featured, fn ($query) => $query->where('id', '!=', $featured->id))
            ->orderByDesc('published_at')
            ->orderBy('sort_order')
            ->paginate(9, ['id', 'title', 'slug', 'excerpt', 'cover_image_path', 'cover_image_alt', 'category', 'published_at']);

        $articles->getCollection()->transform(fn (NewsArticle $article) => $this->articleSummary($article));
        $seo = PageSeo::where('page_key', self::SEO_KEY)->first(['title', 'description', 'og_image_path']);

        return $this->success([
            'content' => $this->contentPayload($content),
            'seo' => $seo,
            'featured' => $featured ? $this->articleSummary($featured) : null,
            'articles' => $articles,
        ]);
    }

    private function resolveFeatured(?NewsPageContent $content): ?NewsArticle
    {
        $featured = $content?->featuredArticle;
        if ($featured && $this->isPublishedGuide($featured)) return $featured;

        return NewsArticle::published()
            ->where('category', self::CATEGORY)
            ->orderByDesc('published_at')
            ->orderBy('sort_order')
            ->first();
    }

    private function contentPayload(?NewsPageContent $content): array
    {
        return [
            'id' => $content?->id,
            'page_key' => self::PAGE_KEY,
            'eyebrow' => $content?->eyebrow,
            'title' => $content?->title,
            'description' => $content?->description,
            'hero_image_path' => $this->assetUrl($content?->hero_image_path),
            'hero_image_alt' => $content?->hero_image_alt,
            'featured_article_id' => $content?->featured_article_id,
            'featured_badge_label' => $content?->featured_badge_label,
            'list_eyebrow' => $content?->list_eyebrow,
            'list_title' => $content?->list_title,
            'list_description' => $content?->list_description,
            'show_cta' => (bool) $content?->show_cta,
            'cta_eyebrow' => $content?->cta_eyebrow,
            'cta_title' => $content?->cta_title,
            'cta_description' => $content?->cta_description,
            'cta_primary_label' => $content?->cta_primary_label,
            'cta_primary_url' => $content?->cta_primary_url,
            'cta_secondary_label' => $content?->cta_secondary_label,
            'cta_secondary_url' => $content?->cta_secondary_url,
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
            'cover_image_path' => $this->assetUrl($article->cover_image_path),
            'cover_image_alt' => $article->cover_image_alt,
            'category' => $article->category,
            'published_at' => $article->published_at?->toISOString(),
        ];
    }

    private function isPublishedGuide(NewsArticle $article): bool
    {
        return $article->category === self::CATEGORY
            && $article->status === 'published'
            && ($article->published_at === null || $article->published_at <= now());
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) return null;

        return str_starts_with($path, '/') || str_starts_with($path, 'http') ? $path : Storage::disk('public')->url($path);
    }
}
