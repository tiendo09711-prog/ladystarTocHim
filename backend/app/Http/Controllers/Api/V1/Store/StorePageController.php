<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\PageSeo;
use App\Models\StorePageContent;
use App\Models\StorePageItem;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;

class StorePageController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $content = StorePageContent::where('page_key', 'store-locations')->first();
        $seo = PageSeo::where('page_key', 'he-thong-cua-hang')->first(['title', 'description', 'og_image_path']);

        if (! $content) {
            return $this->success(['content' => null, 'steps' => [], 'policies' => [], 'branches' => [], 'seo' => $seo]);
        }

        $items = $content->items()->where('is_active', true)->orderBy('sort_order')->get();
        $branches = Branch::query()
            ->where('is_active', true)
            ->where('show_on_store_page', true)
            ->orderBy('public_sort_order')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(fn (Branch $branch) => $this->branchPayload($branch));

        return $this->success([
            'content' => $this->contentPayload($content),
            'steps' => $items->where('item_type', 'process')->values()->map(fn (StorePageItem $item) => $this->itemPayload($item)),
            'policies' => $items->where('item_type', 'policy')->values()->map(fn (StorePageItem $item) => $this->itemPayload($item)),
            'branches' => $branches,
            'seo' => $seo,
        ]);
    }

    private function contentPayload(StorePageContent $content): array
    {
        $data = $content->only([
            'id', 'page_key', 'eyebrow', 'title', 'description', 'hero_image_alt', 'locations_eyebrow', 'locations_title',
            'locations_description', 'empty_title', 'empty_description', 'support_title', 'support_description', 'process_eyebrow',
            'process_title', 'process_description', 'policies_eyebrow', 'policies_title', 'policies_description', 'contact_eyebrow',
            'contact_title', 'contact_description', 'contact_image_alt',
        ]);
        $data['hero_image_path'] = $this->assetUrl($content->hero_image_path);
        $data['contact_image_path'] = $this->assetUrl($content->contact_image_path);
        $data['settings'] = $content->settings_json ?? [];

        return $data;
    }

    private function itemPayload(StorePageItem $item): array
    {
        return [
            'id' => $item->id,
            'item_type' => $item->item_type,
            'title' => $item->title,
            'description' => $item->description,
            'image_path' => $this->assetUrl($item->image_path),
            'image_alt' => $item->image_alt,
            'icon' => $item->icon,
            'sort_order' => $item->sort_order,
        ];
    }

    private function branchPayload(Branch $branch): array
    {
        return [
            'id' => $branch->id,
            'name' => $branch->name,
            'code' => $branch->code,
            'phone' => $branch->phone,
            'email' => $branch->email,
            'province' => $branch->province,
            'district' => $branch->district,
            'ward' => $branch->ward,
            'address_line' => $branch->address_line,
            'full_address' => collect([$branch->address_line, $branch->ward, $branch->district, $branch->province])->filter()->implode(', '),
            'public_description' => $branch->public_description,
            'opening_hours' => $branch->opening_hours,
            'image_path' => $this->assetUrl($branch->image_path),
            'image_alt' => $branch->image_alt,
            'latitude' => $branch->latitude,
            'longitude' => $branch->longitude,
            'booking_url' => $branch->booking_url,
            'map_url' => $branch->map_url,
        ];
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) return null;

        return str_starts_with($path, '/') || str_starts_with($path, 'http') ? $path : Storage::disk('public')->url($path);
    }
}
