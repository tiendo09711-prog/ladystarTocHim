<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\NewsPageContentRequest;
use App\Models\NewsArticle;
use App\Models\NewsPageContent;
use App\Models\PageSeo;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GuidePageContentManagementController extends Controller
{
    use ApiResponse;

    private const PAGE_KEY = 'guides';
    private const SEO_KEY = 'huong-dan';
    private const CATEGORY = 'Hướng dẫn';

    public function show()
    {
        return $this->success($this->payload($this->content()));
    }

    public function update(NewsPageContentRequest $request)
    {
        $data = $request->validatedContent();
        $featuredId = $data['featured_article_id'] ?? null;
        if ($featuredId) {
            $featured = NewsArticle::find($featuredId);
            if (! $featured || ! $this->isPublishedGuide($featured)) {
                throw ValidationException::withMessages(['featured_article_id' => ['Bài nổi bật phải là bài hướng dẫn đã xuất bản.']]);
            }
        }

        DB::transaction(function () use ($data, $request) {
            $this->content()->update($data);
            $seo = $request->validatedSeo();
            if ($seo !== null) {
                $seo['title'] = $seo['title'] ?: PageSeo::where('page_key', self::SEO_KEY)->value('title') ?: ($data['title'] ?? null) ?: 'Hướng dẫn | LADYSTARS';
                PageSeo::updateOrCreate(['page_key' => self::SEO_KEY], $seo);
            }
        });

        return $this->success($this->payload($this->content()->fresh()), 'Đã lưu thiết lập trang hướng dẫn.');
    }

    public function uploadHeroImage(Request $request)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'hero_image_alt' => ['nullable', 'string', 'max:190'],
        ]);
        $content = $this->content();
        $path = $data['image']->storePubliclyAs('guides-page', Str::uuid().'.'.$data['image']->extension(), 'public');
        $oldPath = $content->hero_image_path;
        $content->update([
            'hero_image_path' => $path,
            'hero_image_alt' => $data['hero_image_alt'] ?? $content->hero_image_alt,
        ]);
        $this->deleteLocalAsset($oldPath);

        return $this->success($this->payload($content->fresh()), 'Đã tải ảnh nền trang hướng dẫn.', 201);
    }

    public function deleteHeroImage()
    {
        $content = $this->content();
        $this->deleteLocalAsset($content->hero_image_path);
        $content->update(['hero_image_path' => null]);

        return $this->success($this->payload($content->fresh()), 'Đã xóa ảnh nền trang hướng dẫn.');
    }

    private function content(): NewsPageContent
    {
        return NewsPageContent::firstOrCreate(['page_key' => self::PAGE_KEY], ['show_cta' => false]);
    }

    private function payload(NewsPageContent $content): array
    {
        $articles = NewsArticle::query()
            ->where('category', self::CATEGORY)
            ->orderByDesc('published_at')
            ->get(['id', 'title', 'slug', 'cover_image_path', 'cover_image_alt', 'category', 'published_at', 'status'])
            ->map(fn (NewsArticle $article) => [
                ...$article->toArray(),
                'cover_image_path' => $this->assetUrl($article->cover_image_path),
                'has_cover' => filled($article->cover_image_path),
            ])->values();

        return [
            'content' => [
                ...$content->toArray(),
                'hero_image_path' => $this->assetUrl($content->hero_image_path),
                'cta_image_path' => $this->assetUrl($content->cta_image_path),
            ],
            'seo' => PageSeo::where('page_key', self::SEO_KEY)->first(['title', 'description', 'og_image_path']) ?? ['title' => null, 'description' => null, 'og_image_path' => null],
            'articles' => $articles,
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

    private function deleteLocalAsset(?string $path): void
    {
        if ($path && ! str_starts_with($path, '/') && ! str_starts_with($path, 'http')) Storage::disk('public')->delete($path);
    }
}
