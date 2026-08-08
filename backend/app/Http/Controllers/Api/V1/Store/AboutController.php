<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\AboutSection;
use App\Models\PageSeo;
use App\Support\AboutContent;
use App\Support\ApiResponse;
use Illuminate\Support\Collection;

class AboutController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $sections = AboutSection::published()->orderBy('sort_order')->get();
        if ($sections->isEmpty()) {
            $sections = $this->fallbackSections();
        }

        return $this->success([
            'sections' => $sections->map(fn ($section) => $this->serialize($section))->values(),
            'seo' => $this->seoData('gioi-thieu'),
        ]);
    }

    public function seo(string $pageKey)
    {
        $seo = $this->seoData($pageKey);
        abort_unless($seo, 404);

        return $this->success($seo);
    }

    private function seoData(string $pageKey): ?array
    {
        $seo = PageSeo::where('page_key', $pageKey)->first();
        if ($seo) {
            return ['title' => $seo->title, 'description' => $seo->description, 'og_image_path' => $seo->og_image_path];
        }
        $fallback = collect(AboutContent::seos())->firstWhere('page_key', $pageKey);

        return $fallback ? ['title' => $fallback['title'], 'description' => $fallback['description'], 'og_image_path' => null] : null;
    }

    private function fallbackSections(): Collection
    {
        return collect(AboutContent::sections())->map(fn (array $section) => new AboutSection(array_merge($section, [
            'settings_json' => $section['settings'] ?? null,
            'is_active' => true,
        ])));
    }

    private function serialize(AboutSection $section): array
    {
        return [
            'section_key' => $section->section_key,
            'section_type' => $section->section_type,
            'eyebrow' => $section->eyebrow,
            'title' => $section->title,
            'subtitle' => $section->subtitle,
            'body' => $section->body,
            'image_path' => $section->image_path,
            'image_alt' => $section->image_alt,
            'secondary_image_path' => $section->secondary_image_path,
            'secondary_image_alt' => $section->secondary_image_alt,
            'cta_label' => $section->cta_label,
            'cta_url' => $section->cta_url,
            'settings' => $section->settings_json ?? [],
            'sort_order' => $section->sort_order,
        ];
    }
}
