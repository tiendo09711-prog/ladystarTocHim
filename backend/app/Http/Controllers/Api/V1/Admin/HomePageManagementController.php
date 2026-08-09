<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\HomePageContentRequest;
use App\Models\HomePageContent;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class HomePageManagementController extends Controller
{
    use ApiResponse;

    public function show()
    {
        return $this->success($this->payload(HomePageContent::current()));
    }

    public function update(HomePageContentRequest $request)
    {
        $content = HomePageContent::current();
        $oldPaths = $this->sectionAssetPaths($content->normalizedSections());
        $content->update($request->validated());
        $newPaths = $this->sectionAssetPaths($content->fresh()->normalizedSections());

        foreach (array_diff($oldPaths, $newPaths) as $path) {
            $this->deleteLocalAsset($path);
        }

        return $this->success($this->payload($content->refresh()), 'Đã lưu nội dung trang chủ.');
    }

    public function uploadHeroImage(Request $request)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'hero_image_alt' => ['nullable', 'string', 'max:190'],
        ]);
        $content = HomePageContent::current();
        $path = $data['image']->storePubliclyAs('home-page/hero', Str::uuid().'.'.$data['image']->extension(), 'public');
        $oldPath = $content->hero_image_path;
        $content->update([
            'hero_image_path' => $path,
            'hero_image_alt' => $data['hero_image_alt'] ?? $content->hero_image_alt,
        ]);
        $this->deleteLocalAsset($oldPath);

        return $this->success($this->payload($content->fresh()), 'Đã cập nhật ảnh Hero trang chủ.', 201);
    }

    public function deleteHeroImage()
    {
        $content = HomePageContent::current();
        $this->deleteLocalAsset($content->hero_image_path);
        $content->update(['hero_image_path' => null]);

        return $this->success($this->payload($content->fresh()), 'Đã xóa ảnh Hero trang chủ.');
    }

    public function uploadBrandStoryImage(Request $request)
    {
        $data = $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $content = HomePageContent::current();
        $path = $data['image']->storePubliclyAs('home-page/brand-story', Str::uuid().'.'.$data['image']->extension(), 'public');
        $oldPath = $content->brand_story_image_path;
        $content->update(['brand_story_image_path' => $path]);
        $this->deleteLocalAsset($oldPath);

        return $this->success($this->payload($content->fresh()), 'Đã cập nhật ảnh Câu chuyện thương hiệu.', 201);
    }

    public function deleteBrandStoryImage()
    {
        $content = HomePageContent::current();
        $this->deleteLocalAsset($content->brand_story_image_path);
        $content->update(['brand_story_image_path' => null]);

        return $this->success($this->payload($content->fresh()), 'Đã xóa ảnh Câu chuyện thương hiệu.');
    }

    public function uploadSectionImage(Request $request, string $slot, ?string $index = null)
    {
        $data = $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        [$section, $listKey, $folder] = $this->sectionImageSlot($slot);
        $content = HomePageContent::current();
        $sections = $content->normalizedSections();
        $itemIndex = $this->sectionImageIndex($sections, $section, $listKey, $index);
        $path = $data['image']->storePubliclyAs("home-page/{$folder}", Str::uuid().'.'.$data['image']->extension(), 'public');

        if ($listKey === null) {
            $oldPath = $sections[$section]['image_path'] ?? null;
            $sections[$section]['image_path'] = $path;
        } else {
            $oldPath = $sections[$section][$listKey][$itemIndex]['image_path'] ?? null;
            $sections[$section][$listKey][$itemIndex]['image_path'] = $path;
        }

        $content->update(['sections' => $sections]);
        $this->deleteLocalAsset($oldPath);

        return $this->success($this->payload($content->fresh()), 'Đã cập nhật ảnh nội dung trang chủ.', 201);
    }

    public function deleteSectionImage(string $slot, ?string $index = null)
    {
        [$section, $listKey] = $this->sectionImageSlot($slot);
        $content = HomePageContent::current();
        $sections = $content->normalizedSections();
        $itemIndex = $this->sectionImageIndex($sections, $section, $listKey, $index);

        if ($listKey === null) {
            $oldPath = $sections[$section]['image_path'] ?? null;
            $sections[$section]['image_path'] = null;
        } else {
            $oldPath = $sections[$section][$listKey][$itemIndex]['image_path'] ?? null;
            $sections[$section][$listKey][$itemIndex]['image_path'] = null;
        }

        $content->update(['sections' => $sections]);
        $this->deleteLocalAsset($oldPath);

        return $this->success($this->payload($content->fresh()), 'Đã xóa ảnh nội dung trang chủ.');
    }

    private function payload(HomePageContent $content): array
    {
        return [
            ...$content->toArray(),
            'hero_image_path' => $this->assetUrl($content->hero_image_path),
            'brand_story_image_path' => $this->assetUrl($content->brand_story_image_path),
            'sections' => $content->normalizedSections(),
        ];
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) return null;

        return str_starts_with($path, '/') || Str::startsWith($path, ['http://', 'https://'])
            ? $path
            : Storage::disk('public')->url($path);
    }

    private function deleteLocalAsset(?string $path): void
    {
        if ($path && ! str_starts_with($path, '/') && ! Str::startsWith($path, ['http://', 'https://'])) {
            Storage::disk('public')->delete($path);
        }
    }

    private function sectionImageSlot(string $slot): array
    {
        return match ($slot) {
            'solutions' => ['solutions', null, 'solutions'],
            'styles' => ['styles', 'items', 'styles'],
            'process' => ['process', 'steps', 'process'],
            'testimonials' => ['testimonials', 'items', 'testimonials'],
            default => abort(404),
        };
    }

    private function sectionImageIndex(array $sections, string $section, ?string $listKey, ?string $index): ?int
    {
        if ($listKey === null) {
            if ($index !== null) abort(404);

            return null;
        }

        if ($index === null || ! ctype_digit($index)) abort(404);
        $itemIndex = (int) $index;
        if (! isset($sections[$section][$listKey][$itemIndex])) abort(404);

        return $itemIndex;
    }

    private function sectionAssetPaths(array $sections): array
    {
        $paths = [$sections['solutions']['image_path'] ?? null];

        foreach ([['styles', 'items'], ['process', 'steps'], ['testimonials', 'items']] as [$section, $listKey]) {
            foreach ($sections[$section][$listKey] ?? [] as $item) {
                $paths[] = is_array($item) ? ($item['image_path'] ?? null) : null;
            }
        }

        return array_values(array_filter($paths, fn (mixed $path) => is_string($path) && $path !== ''));
    }
}
