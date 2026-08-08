<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CatalogPageContentRequest;
use App\Models\CatalogPageContent;
use App\Models\Category;
use App\Models\PageSeo;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CatalogContentManagementController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->success(['contents' => CatalogPageContent::with('category')->orderBy('page_key')->get(), 'categories' => Category::where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'slug'])]);
    }

    public function show(string $pageKey)
    {
        [$content, $category] = $this->contentFor($pageKey);
        return $this->success($this->payload($content, $pageKey, $category));
    }

    public function update(CatalogPageContentRequest $request, string $pageKey)
    {
        [$content, $category] = $this->contentFor($pageKey);
        $data = $request->safe()->except('seo') + ['page_key' => $pageKey, 'category_id' => $category?->id];
        DB::transaction(function () use ($content, $data, $request, $pageKey) {
            $content->fill($data)->save();
            if (is_array($request->input('seo'))) {
                $seo = $request->validated('seo');
                PageSeo::updateOrCreate(['page_key' => $pageKey], ['title' => $seo['title'] ?: ($content->title ?: 'LADYSTARS'), 'description' => $seo['description'] ?? null]);
            }
        });
        return $this->success($this->payload($content->fresh(), $pageKey, $category));
    }

    public function uploadImage(Request $request, string $pageKey)
    {
        [$content] = $this->contentFor($pageKey);
        $data = $request->validate(['slot' => ['required', 'in:hero,consultation'], 'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $field = $data['slot'] === 'hero' ? 'hero_image_path' : 'consultation_image_path';
        $oldPath = $content->{$field};
        $path = $data['image']->storePubliclyAs('catalog/'.$pageKey, Str::uuid().'.'.$data['image']->extension(), 'public');
        $content->update([$field => $path]);
        $this->deleteLocalAsset($oldPath);

        return $this->success([$field => Storage::disk('public')->url($path)], 'Đã tải ảnh catalog.', 201);
    }

    public function deleteImage(Request $request, string $pageKey)
    {
        [$content] = $this->contentFor($pageKey);
        $data = $request->validate(['slot' => ['required', 'in:hero,consultation']]);
        $field = $data['slot'] === 'hero' ? 'hero_image_path' : 'consultation_image_path';
        $oldPath = $content->{$field};
        $content->update([$field => null]);
        $this->deleteLocalAsset($oldPath);

        return $this->success(null, 'Đã xóa ảnh catalog.');
    }

    private function contentFor(string $pageKey): array
    {
        $category = null;
        if ($pageKey !== 'products') {
            abort_unless(preg_match('/^category-(\d+)$/', $pageKey, $matches) === 1, 404);
            $category = Category::findOrFail((int) $matches[1]);
        }
        return [CatalogPageContent::firstOrNew(['page_key' => $pageKey], ['category_id' => $category?->id, 'is_active' => true]), $category];
    }

    private function payload(CatalogPageContent $content, string $pageKey, ?Category $category): array
    {
        return $content->toArray() + ['page_key' => $pageKey, 'category' => $category, 'seo' => PageSeo::where('page_key', $pageKey)->first(['title', 'description', 'og_image_path'])];
    }

    private function deleteLocalAsset(?string $path): void
    {
        if ($path && ! str_starts_with($path, '/') && ! str_starts_with($path, 'http')) Storage::disk('public')->delete($path);
    }
}
