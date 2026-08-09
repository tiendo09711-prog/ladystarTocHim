<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\ContactPageContent;
use App\Models\PageSeo;
use App\Models\StoreSetting;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;

class ContactPageController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $content = ContactPageContent::where('page_key', 'contact')->first();
        $seo = PageSeo::where('page_key', 'lien-he')->first(['title', 'description', 'og_image_path']);

        if (! $content) {
            return $this->success(['content' => null, 'store' => null, 'branches' => [], 'seo' => $seo]);
        }

        $settings = StoreSetting::current();
        $branches = Branch::query()
            ->where('is_active', true)
            ->where('show_on_store_page', true)
            ->orderBy('public_sort_order')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(fn (Branch $branch) => [
                'id' => $branch->id,
                'name' => $branch->name,
                'phone' => $branch->phone,
                'email' => $branch->email,
                'full_address' => collect([$branch->address_line, $branch->ward, $branch->district, $branch->province])->filter()->implode(', '),
                'opening_hours' => $branch->opening_hours,
                'map_url' => $branch->map_url,
            ]);

        return $this->success([
            'content' => $this->contentPayload($content),
            'store' => [
                'store_name' => $settings->store_name,
                'support_phone' => $settings->support_phone,
                'support_email' => $settings->support_email,
                'store_address' => $settings->store_address,
            ],
            'branches' => $branches,
            'seo' => $seo,
        ]);
    }

    private function contentPayload(ContactPageContent $content): array
    {
        $data = $content->toArray();
        $data['hero_image_path'] = $this->assetUrl($content->hero_image_path);
        $data['guide_image_path'] = $this->assetUrl($content->guide_image_path);
        $data['settings'] = $content->settings_json ?? [];
        unset($data['settings_json']);

        return $data;
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) return null;

        return str_starts_with($path, '/') || str_starts_with($path, 'http') ? $path : Storage::disk('public')->url($path);
    }
}
