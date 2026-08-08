<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AboutSectionRequest;
use App\Models\AboutSection;
use App\Models\PageSeo;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AboutManagementController extends Controller
{
    use ApiResponse;

    private const SETTING_STRING_KEYS = ['secondary_cta_label', 'secondary_cta_url', 'image_badge', 'quote', 'layout', 'caption_title', 'caption_subtitle'];
    private const SETTING_LIST_KEYS = ['trust_items', 'pills'];
    private const ITEM_KEYS = ['icon', 'title', 'description', 'quote', 'name', 'role', 'rating', 'label'];

    public function index()
    {
        return $this->success(AboutSection::orderBy('sort_order')->get());
    }

    public function show(AboutSection $section)
    {
        return $this->success($section);
    }

    public function store(AboutSectionRequest $request)
    {
        $data = $request->validated();
        $data['settings_json'] = $this->sanitizeSettings($data['settings'] ?? null);
        unset($data['settings']);
        $section = AboutSection::create($data + ['published_at' => now()]);

        return $this->success($section, 'Đã tạo section.', 201);
    }

    public function update(AboutSectionRequest $request, AboutSection $section)
    {
        $data = $request->validated();
        if (array_key_exists('settings', $data)) {
            $data['settings_json'] = $this->sanitizeSettings($data['settings']);
            unset($data['settings']);
        }
        $section->update($data);

        return $this->success($section->fresh(), 'Đã lưu section.');
    }

    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*' => ['integer', 'exists:about_sections,id'],
        ]);
        foreach ($data['order'] as $index => $id) {
            AboutSection::whereKey($id)->update(['sort_order' => $index + 1]);
        }

        return $this->success(AboutSection::orderBy('sort_order')->get(), 'Đã cập nhật thứ tự section.');
    }

    public function status(Request $request, AboutSection $section)
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $section->update(['is_active' => $data['is_active']]);

        return $this->success($section->fresh());
    }

    public function uploadImage(Request $request, AboutSection $section)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'slot' => ['nullable', Rule::in(['primary', 'secondary'])],
            'image_alt' => ['nullable', 'string', 'max:190'],
        ]);
        $slot = $data['slot'] ?? 'primary';
        $path = $data['image']->storePubliclyAs('about/'.$section->section_key, Str::uuid().'.'.$data['image']->extension(), 'public');

        $column = $slot === 'secondary' ? 'secondary_image_path' : 'image_path';
        $oldPath = $section->{$column};
        $section->update([$column => $path] + ($slot === 'primary' && array_key_exists('image_alt', $data) ? ['image_alt' => $data['image_alt']] : []));
        $this->deleteStoredFile($oldPath);

        return $this->success($section->fresh(), 'Tải ảnh thành công.', 201);
    }

    public function deleteImage(Request $request, AboutSection $section)
    {
        $data = $request->validate(['slot' => ['nullable', Rule::in(['primary', 'secondary'])]]);
        $column = ($data['slot'] ?? 'primary') === 'secondary' ? 'secondary_image_path' : 'image_path';
        $this->deleteStoredFile($section->{$column});
        $section->update([$column => null]);

        return $this->success($section->fresh(), 'Đã xóa ảnh.');
    }

    public function seos()
    {
        return $this->success(PageSeo::orderBy('page_key')->get());
    }

    public function updateSeo(Request $request, string $pageKey)
    {
        abort_unless(preg_match('/^[a-z0-9-]+$/', $pageKey) === 1, 404);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'description' => ['nullable', 'string', 'max:320'],
        ]);
        $seo = PageSeo::updateOrCreate(['page_key' => $pageKey], $data);

        return $this->success($seo, 'Đã lưu SEO trang.');
    }

    private function deleteStoredFile(?string $path): void
    {
        if ($path && ! str_starts_with($path, '/') && ! preg_match('/^https?:\/\//', $path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function sanitizeSettings(?array $settings): ?array
    {
        if (! is_array($settings)) {
            return null;
        }
        $clean = [];
        foreach (self::SETTING_STRING_KEYS as $key) {
            if (isset($settings[$key]) && is_string($settings[$key])) {
                $clean[$key] = $settings[$key];
            }
        }
        foreach (self::SETTING_LIST_KEYS as $key) {
            if (isset($settings[$key]) && is_array($settings[$key])) {
                $clean[$key] = array_values(array_filter($settings[$key], 'is_string'));
            }
        }
        foreach (['floating_card'] as $key) {
            if (isset($settings[$key]) && is_array($settings[$key])) {
                $clean[$key] = array_intersect_key($settings[$key], array_flip(['title', 'subtitle']));
            }
        }
        foreach (['items', 'steps'] as $listKey) {
            if (! isset($settings[$listKey]) || ! is_array($settings[$listKey])) {
                continue;
            }
            $clean[$listKey] = [];
            foreach ($settings[$listKey] as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $entry = [];
                foreach (self::ITEM_KEYS as $field) {
                    if (! array_key_exists($field, $item)) {
                        continue;
                    }
                    $entry[$field] = $field === 'rating' ? (int) $item[$field] : (is_string($item[$field]) ? $item[$field] : null);
                }
                $clean[$listKey][] = array_filter($entry, fn ($value) => $value !== null);
            }
        }

        return $clean;
    }
}
