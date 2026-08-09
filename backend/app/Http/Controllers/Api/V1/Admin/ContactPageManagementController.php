<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ContactPageContentRequest;
use App\Models\ContactPageContent;
use App\Models\PageSeo;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ContactPageManagementController extends Controller
{
    use ApiResponse;

    public function show()
    {
        $content = ContactPageContent::firstOrCreate(['page_key' => 'contact']);
        $seo = PageSeo::where('page_key', 'lien-he')->first(['title', 'description', 'og_image_path']);

        return $this->success(['content' => $this->contentPayload($content), 'seo' => $seo]);
    }

    public function update(ContactPageContentRequest $request)
    {
        $content = ContactPageContent::firstOrCreate(['page_key' => 'contact']);
        $data = $request->safe()->except(['settings', 'seo']);
        if ($request->has('settings')) $data['settings_json'] = $request->validated('settings');
        $content->update($data);

        if ($request->has('seo')) {
            PageSeo::updateOrCreate(['page_key' => 'lien-he'], $request->validated('seo') ?? []);
        }

        return $this->show();
    }

    public function uploadImage(Request $request, string $slot)
    {
        abort_unless(in_array($slot, ['hero', 'guide'], true), 404);
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $content = ContactPageContent::firstOrCreate(['page_key' => 'contact']);
        $field = $slot.'_image_path';
        $this->deleteLocalAsset($content->{$field});
        $path = $request->file('image')->store('contact-page/'.$slot, 'public');
        $content->update([$field => $path]);

        return $this->success([$field => Storage::disk('public')->url($path)], 'Đã tải ảnh trang liên hệ.', 201);
    }

    public function deleteImage(string $slot)
    {
        abort_unless(in_array($slot, ['hero', 'guide'], true), 404);
        $content = ContactPageContent::where('page_key', 'contact')->firstOrFail();
        $field = $slot.'_image_path';
        $this->deleteLocalAsset($content->{$field});
        $content->update([$field => null]);

        return $this->success(null, 'Đã xóa ảnh trang liên hệ.');
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

    private function deleteLocalAsset(?string $path): void
    {
        if ($path && ! str_starts_with($path, '/') && ! Str::startsWith($path, ['http://', 'https://'])) {
            Storage::disk('public')->delete($path);
        }
    }
}
