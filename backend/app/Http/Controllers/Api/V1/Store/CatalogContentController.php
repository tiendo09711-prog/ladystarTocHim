<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\CatalogPageContent;
use App\Models\Category;
use App\Models\PageSeo;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;

class CatalogContentController extends Controller
{
    private const FALLBACK_TITLE = 'Catalog';
    use ApiResponse;

    public function products()
    {
        return $this->success($this->payload(CatalogPageContent::where('page_key', 'products')->where('is_active', true)->first(), 'products'));
    }

    public function category(string $slug)
    {
        $category = Category::where('slug', $slug)->where('is_active', true)->firstOrFail();
        $pageKey = 'category-'.$category->id;

        return $this->success($this->payload(CatalogPageContent::where('page_key', $pageKey)->where('is_active', true)->first(), $pageKey, $category));
    }

    private function payload(?CatalogPageContent $content, string $pageKey, ?Category $category = null): array
    {
        $title = $content?->title ?? $category?->name ?? self::FALLBACK_TITLE;
        $subtitle = $content?->subtitle ?? $category?->description ?? 'Discover a tailored LADYSTARS solution for your style and everyday comfort.';

        return [
            'page_key' => $pageKey,
            'eyebrow' => $content?->eyebrow ?? ($category ? 'LADYSTARS category' : 'LADYSTARS collection'),
            'title' => $title,
            'subtitle' => $subtitle,
            'hero_image_path' => $this->url($content?->hero_image_path ?? $category?->image_path),
            'hero_image_alt' => $content?->hero_image_alt ?? $title,
            'editorial_title' => $content?->editorial_title ?? $title,
            'editorial_intro' => $content?->editorial_intro ?? $subtitle,
            'editorial_sections' => $content?->editorial_sections_json ?? [],
            'consultation_title' => $content?->consultation_title ?? 'Get a personal consultation',
            'consultation_body' => $content?->consultation_body ?? 'Leave your details and our team will help you find a suitable product.',
            'consultation_image_path' => $this->url($content?->consultation_image_path),
            'consultation_image_alt' => $content?->consultation_image_alt ?? 'LADYSTARS consultation',
            'consultation_cta_label' => $content?->consultation_cta_label ?? 'Request consultation',
            'settings' => $content?->settings_json ?? [],
            'seo' => PageSeo::where('page_key', $pageKey)->first(['title', 'description', 'og_image_path']),
        ];
    }

    private function url(?string $path): ?string
    {
        if (! $path) return null;
        return str_starts_with($path, '/') || str_starts_with($path, 'http') ? $path : Storage::disk('public')->url($path);
    }
}
