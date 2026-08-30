<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Models\CatalogPageContent;
use App\Models\Category;
use App\Models\PageSeo;
use App\Models\Service;
use App\Models\StoreSetting;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;

class CatalogContentController extends Controller
{
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

    public function hairGuide()
    {
        $content = CatalogPageContent::where('page_key', 'hair-guide')->where('is_active', true)->first();
        $payload = $this->payload($content, 'hair-guide');
        $payload['services'] = ServiceResource::collection(Service::active()->orderBy('sort_order')->orderBy('id')->get())->resolve();
        $settings = StoreSetting::query()->first(['support_phone', 'support_email']);
        $payload['contact'] = [
            'support_phone' => $settings?->support_phone,
            'support_email' => $settings?->support_email,
        ];

        return $this->success($payload);
    }

    private function payload(?CatalogPageContent $content, string $pageKey, ?Category $category = null): array
    {
        $title = $content?->title ?? $category?->name;
        $subtitle = $content?->subtitle ?? $category?->description;

        return [
            'page_key' => $pageKey,
            'eyebrow' => $content?->eyebrow,
            'title' => $title,
            'subtitle' => $subtitle,
            'hero_image_path' => $this->url($content?->hero_image_path ?? $category?->image_path),
            'hero_image_alt' => $content?->hero_image_alt,
            'editorial_title' => $content?->editorial_title,
            'editorial_intro' => $content?->editorial_intro,
            'editorial_sections' => $content?->editorial_sections_json ?? [],
            'consultation_title' => $content?->consultation_title,
            'consultation_body' => $content?->consultation_body,
            'consultation_image_path' => $this->url($content?->consultation_image_path),
            'consultation_image_alt' => $content?->consultation_image_alt,
            'consultation_cta_label' => $content?->consultation_cta_label,
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
