<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\CatalogPageContent;
use App\Models\Category;
use App\Models\PageSeo;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
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

    public function hairGuide()
    {
        $content = CatalogPageContent::where('page_key', 'hair-guide')->where('is_active', true)->first();
        $payload = $this->payload($content, 'hair-guide');
        $guideItems = collect($content?->settings_json['guide_products'] ?? []);
        $productIds = $guideItems->pluck('product_id')->filter()->map(fn ($id) => (int) $id)->values()->all();
        $products = $this->guideProducts($productIds)->keyBy('id');

        $payload['products'] = $guideItems->map(function (array $item) use ($products) {
            $product = $products->get((int) ($item['product_id'] ?? 0));
            if (! $product) return null;

            return [
                'product' => (new ProductResource($product))->resolve(),
                'badge' => $item['badge'] ?? null,
                'note' => $item['note'] ?? null,
            ];
        })->filter()->values()->all();
        $settings = StoreSetting::query()->first(['support_phone', 'support_email']);
        $payload['contact'] = [
            'support_phone' => $settings?->support_phone,
            'support_email' => $settings?->support_email,
        ];

        return $this->success($payload);
    }

    private function payload(?CatalogPageContent $content, string $pageKey, ?Category $category = null): array
    {
        $fallbackTitle = $pageKey === 'hair-guide' ? 'Dịch vụ chăm sóc tóc phù hợp với bạn' : self::FALLBACK_TITLE;
        $title = $content?->title ?? $category?->name ?? $fallbackTitle;
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

    private function guideProducts(array $productIds)
    {
        if (! $productIds) return collect();

        return Product::query()
            ->whereIn('id', $productIds)
            ->where('status', 'active')
            ->whereHas('variants', fn (Builder $query) => $query->where('status', 'active'))
            ->with([
                'category',
                'brand',
                'images',
                'variants' => fn ($query) => $query->where('status', 'active')->with('attributeValues', 'inventories'),
            ])
            ->withAvg(['reviews' => fn (Builder $query) => $query->where('status', 'approved')], 'rating')
            ->withCount(['reviews' => fn (Builder $query) => $query->where('status', 'approved')])
            ->get();
    }
}
