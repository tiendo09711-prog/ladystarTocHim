<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\NewsPageContentRequest;
use App\Models\NewsArticle;
use App\Models\NewsPageContent;
use App\Models\PageSeo;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PromotionPageContentManagementController extends Controller
{
    use ApiResponse;

    private const PAGE_KEY = 'promotions';
    private const SEO_KEY = 'uu-dai';
    private const CATEGORY = 'Ưu đãi';

    public function show()
    {
        return $this->success($this->payload($this->content()));
    }

    public function update(NewsPageContentRequest $request)
    {
        $content = $this->content();
        $data = $request->validatedContent();
        $featuredId = $data['featured_article_id'] ?? null;
        if ($featuredId) {
            $article = NewsArticle::find($featuredId);
            if (! $article || ! $this->isPublishedPromotion($article)) {
                throw ValidationException::withMessages(['featured_article_id' => ['Bài viết nổi bật phải là ưu đãi đã xuất bản.']]);
            }
        }

        $content->fill($data + ['page_key' => self::PAGE_KEY]);
        $content->save();
        $seo = $request->validatedSeo();
        if ($seo !== null) {
            PageSeo::updateOrCreate(['page_key' => self::SEO_KEY], [
                'title' => $seo['title'] ?: ($content->title ?: 'Ưu đãi'),
                'description' => $seo['description'] ?? null,
            ]);
        }

        return $this->success($this->payload($content->fresh()), 'Đã lưu thiết lập trang ưu đãi.');
    }

    public function uploadCtaImage(Request $request)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'cta_image_alt' => ['nullable', 'string', 'max:190'],
        ]);
        $content = $this->content();
        $file = $data['image'];
        $path = $file->storePubliclyAs('promotions-page', Str::uuid().'.'.$file->extension(), 'public');
        $oldPath = $content->cta_image_path;
        $content->cta_image_path = $path;
        if (array_key_exists('cta_image_alt', $data)) {
            $content->cta_image_alt = $data['cta_image_alt'];
        }
        $content->save();
        $this->deleteLocalAsset($oldPath);

        return $this->success(['cta_image_path' => Storage::disk('public')->url($path), 'cta_image_alt' => $content->cta_image_alt], 'Đã tải ảnh CTA.', 201);
    }

    public function deleteCtaImage(Request $request)
    {
        $request->validate(['field' => ['nullable', Rule::in(['cta_image_path', 'cta_image_alt'])]]);
        $content = $this->content();
        $oldPath = $content->cta_image_path;
        $content->cta_image_path = null;
        $content->save();
        $this->deleteLocalAsset($oldPath);

        return $this->success($this->contentPayload($content->fresh()), 'Đã xóa ảnh CTA.');
    }

    private function content(): NewsPageContent
    {
        return NewsPageContent::firstOrNew(['page_key' => self::PAGE_KEY]);
    }

    private function payload(NewsPageContent $content): array
    {
        return [
            'content' => $this->contentPayload($content),
            'seo' => PageSeo::where('page_key', self::SEO_KEY)->first(['title', 'description', 'og_image_path']),
            'articles' => NewsArticle::activePromotion()->orderByDesc('published_at')->orderBy('sort_order')->get(['id', 'title', 'slug', 'cover_image_path', 'cover_image_alt', 'category', 'published_at', 'status'])->map(fn (NewsArticle $article) => $this->articleSummary($article)),
        ];
    }

    private function contentPayload(NewsPageContent $content): array
    {
        return [
            'id' => $content->id,
            'page_key' => $content->page_key,
            'eyebrow' => $content->eyebrow,
            'title' => $content->title,
            'description' => $content->description,
            'featured_article_id' => $content->featured_article_id,
            'featured_badge_label' => $content->featured_badge_label,
            'list_eyebrow' => $content->list_eyebrow,
            'list_title' => $content->list_title,
            'list_description' => $content->list_description,
            'show_cta' => $content->show_cta,
            'cta_eyebrow' => $content->cta_eyebrow,
            'cta_title' => $content->cta_title,
            'cta_description' => $content->cta_description,
            'cta_primary_label' => $content->cta_primary_label,
            'cta_primary_url' => $content->cta_primary_url,
            'cta_secondary_label' => $content->cta_secondary_label,
            'cta_secondary_url' => $content->cta_secondary_url,
            'cta_image_path' => $this->assetUrl($content->cta_image_path),
            'cta_image_alt' => $content->cta_image_alt,
        ];
    }

    private function articleSummary(NewsArticle $article): array
    {
        return [
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'cover_image_path' => $article->cover_image_path,
            'cover_image_alt' => $article->cover_image_alt,
            'category' => $article->category,
            'published_at' => $article->published_at,
            'status' => $article->status,
            'has_cover' => filled($article->cover_image_path),
        ];
    }

    private function isPublishedPromotion(NewsArticle $article): bool
    {
        return NewsArticle::activePromotion()->whereKey($article->id)->exists();
    }

    private function deleteLocalAsset(?string $path): void
    {
        if ($path && ! str_starts_with($path, '/') && ! preg_match('/^https?:\/\//', $path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path || str_starts_with($path, '/') || preg_match('/^https?:\/\//', $path)) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}
