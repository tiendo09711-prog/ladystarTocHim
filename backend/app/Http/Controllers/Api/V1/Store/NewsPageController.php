<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\NewsArticle;
use App\Models\NewsPageContent;
use App\Models\PageSeo;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class NewsPageController extends Controller
{
    use ApiResponse;

    private const DEFAULTS = [
        'eyebrow' => 'TIN TỨC & CẨM NANG',
        'title' => 'Bản tin LADYSTARS',
        'description' => 'Cẩm nang lựa chọn và chăm sóc tóc, câu chuyện thương hiệu cùng những cập nhật mới nhất từ LADYSTARS.',
        'featured_badge_label' => 'Bài viết nổi bật',
        'list_eyebrow' => 'KHÁM PHÁ LADYSTARS',
        'list_title' => 'Bài viết mới nhất',
        'list_description' => 'Những chia sẻ giúp bạn lựa chọn, sử dụng và chăm sóc mái tóc tự tin hơn mỗi ngày.',
        'show_cta' => true,
        'cta_eyebrow' => 'ĐỒNG HÀNH CÙNG LADYSTARS',
        'cta_title' => 'Bạn cần một lựa chọn phù hợp hơn với chính mình?',
        'cta_description' => 'Đội ngũ LADYSTARS luôn sẵn sàng lắng nghe và tư vấn theo nhu cầu, phong cách và thói quen sử dụng của bạn.',
        'cta_primary_label' => 'Nhận tư vấn riêng',
        'cta_primary_url' => '/lien-he',
        'cta_secondary_label' => 'Khám phá sản phẩm',
        'cta_secondary_url' => '/san-pham',
    ];

    public function index(Request $request)
    {
        $pageKey = 'news';
        $content = NewsPageContent::where('page_key', $pageKey)->first();

        $publishedQuery = NewsArticle::published()
            ->where(fn ($query) => $query->whereNull('category')->orWhereNotIn('category', ['Ưu đãi', 'Hướng dẫn']))
            ->orderByDesc('published_at')
            ->orderBy('sort_order');

        $featured = $this->resolveFeatured($content);

        $gridQuery = $publishedQuery->when($featured, fn ($q) => $q->where('id', '!=', $featured->id));
        $articles = $gridQuery->paginate(9, ['id', 'title', 'slug', 'excerpt', 'cover_image_path', 'cover_image_alt', 'category', 'published_at']);

        $seo = PageSeo::where('page_key', 'tin-tuc')->first(['title', 'description', 'og_image_path']);

        return $this->success([
            'content' => $this->contentPayload($content),
            'seo' => $seo ?? ['title' => self::DEFAULTS['title'], 'description' => self::DEFAULTS['description']],
            'featured' => $featured ? $this->articleSummary($featured) : null,
            'articles' => $articles,
        ]);
    }

    private function resolveFeatured(?NewsPageContent $content): ?NewsArticle
    {
        $featured = $content?->featuredArticle;
        if ($featured && $this->isPublished($featured)) {
            return $featured;
        }
        $fallback = NewsArticle::published()
            ->where(fn ($query) => $query->whereNull('category')->orWhereNotIn('category', ['Ưu đãi', 'Hướng dẫn']))
            ->whereNotNull('cover_image_path')
            ->orderByDesc('published_at')
            ->orderBy('sort_order')
            ->first();
        if ($fallback) {
            return $fallback;
        }

        return NewsArticle::published()->where(fn ($query) => $query->whereNull('category')->orWhereNotIn('category', ['Ưu đãi', 'Hướng dẫn']))->orderByDesc('published_at')->orderBy('sort_order')->first();
    }

    private function isPublished(NewsArticle $article): bool
    {
        return $article->status === 'published' && ($article->published_at === null || $article->published_at <= now());
    }

    private function contentPayload(?NewsPageContent $content): array
    {
        $values = [];
        foreach (['eyebrow', 'title', 'description', 'featured_badge_label', 'list_eyebrow', 'list_title', 'list_description', 'cta_eyebrow', 'cta_title', 'cta_description', 'cta_primary_label', 'cta_primary_url', 'cta_secondary_label', 'cta_secondary_url', 'cta_image_alt'] as $key) {
            $values[$key] = $content?->{$key} ?? self::DEFAULTS[$key] ?? null;
        }
        $values['show_cta'] = $content?->show_cta ?? self::DEFAULTS['show_cta'];
        $values['cta_image_path'] = $this->assetUrl($content?->cta_image_path);

        return $values;
    }

    private function articleSummary(NewsArticle $article): array
    {
        return [
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'excerpt' => $article->excerpt,
            'cover_image_path' => $this->assetUrl($article->cover_image_path),
            'cover_image_alt' => $article->cover_image_alt ?? $article->title,
            'category' => $article->category,
            'published_at' => $article->published_at?->toISOString(),
        ];
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return str_starts_with($path, '/') || str_starts_with($path, 'http') ? $path : Storage::disk('public')->url($path);
    }
}
