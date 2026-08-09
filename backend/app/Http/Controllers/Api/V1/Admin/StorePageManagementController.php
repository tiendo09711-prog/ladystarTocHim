<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePageContentRequest;
use App\Http\Requests\Admin\StorePageItemRequest;
use App\Models\Branch;
use App\Models\PageSeo;
use App\Models\StorePageContent;
use App\Models\StorePageItem;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StorePageManagementController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $content = StorePageContent::firstOrCreate(['page_key' => 'store-locations']);
        $content->load(['items' => fn ($query) => $query->orderBy('item_type')->orderBy('sort_order')]);
        $seo = PageSeo::where('page_key', 'he-thong-cua-hang')->first(['title', 'description', 'og_image_path']);

        return $this->success([
            'content' => $this->contentPayload($content),
            'items' => $content->items->map(fn (StorePageItem $item) => $this->itemPayload($item)),
            'seo' => $seo,
        ]);
    }

    public function update(StorePageContentRequest $request)
    {
        $content = StorePageContent::firstOrCreate(['page_key' => 'store-locations']);
        $data = $request->safe()->except(['settings', 'seo']);
        if ($request->has('settings')) $data['settings_json'] = $request->validated('settings');
        $content->update($data);

        if ($request->has('seo')) {
            PageSeo::updateOrCreate(['page_key' => 'he-thong-cua-hang'], $request->validated('seo') ?? []);
        }

        return $this->index();
    }

    public function uploadImage(Request $request, string $slot)
    {
        abort_unless(in_array($slot, ['hero', 'contact'], true), 404);
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $content = StorePageContent::firstOrCreate(['page_key' => 'store-locations']);
        $field = $slot.'_image_path';
        $this->deleteLocalAsset($content->{$field});
        $path = $request->file('image')->store('store-page/'.$slot, 'public');
        $content->update([$field => $path]);

        return $this->success([$field => Storage::disk('public')->url($path)], 'Đã tải ảnh trang cửa hàng.', 201);
    }

    public function deleteImage(string $slot)
    {
        abort_unless(in_array($slot, ['hero', 'contact'], true), 404);
        $content = StorePageContent::where('page_key', 'store-locations')->firstOrFail();
        $field = $slot.'_image_path';
        $this->deleteLocalAsset($content->{$field});
        $content->update([$field => null]);

        return $this->success(null, 'Đã xóa ảnh trang cửa hàng.');
    }

    public function storeItem(StorePageItemRequest $request)
    {
        $content = StorePageContent::firstOrCreate(['page_key' => 'store-locations']);
        $item = $content->items()->create($request->validated());

        return $this->success($this->itemPayload($item), 'Đã tạo nội dung.', 201);
    }

    public function updateItem(StorePageItemRequest $request, StorePageItem $item)
    {
        $item->update($request->validated());

        return $this->success($this->itemPayload($item->fresh()), 'Đã lưu nội dung.');
    }

    public function deleteItem(StorePageItem $item)
    {
        $this->deleteLocalAsset($item->image_path);
        $item->delete();

        return $this->success(null, 'Đã xóa nội dung.');
    }

    public function itemStatus(Request $request, StorePageItem $item)
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $item->update($data);

        return $this->success($this->itemPayload($item), 'Đã cập nhật trạng thái.');
    }

    public function reorderItems(Request $request)
    {
        $data = $request->validate([
            'item_type' => ['required', 'in:process,policy'],
            'order' => ['required', 'array'],
            'order.*' => ['integer', 'exists:store_page_items,id'],
        ]);
        $items = StorePageItem::whereIn('id', $data['order'])->get()->keyBy('id');
        abort_if($items->contains(fn (StorePageItem $item) => $item->item_type !== $data['item_type']), 422);
        foreach ($data['order'] as $index => $id) $items[$id]->update(['sort_order' => $index + 1]);

        return $this->success(null, 'Đã cập nhật thứ tự.');
    }

    public function uploadItemImage(Request $request, StorePageItem $item)
    {
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $this->deleteLocalAsset($item->image_path);
        $path = $request->file('image')->store('store-page/items/'.$item->id, 'public');
        $item->update(['image_path' => $path]);

        return $this->success($this->itemPayload($item), 'Đã tải ảnh nội dung.', 201);
    }

    public function deleteItemImage(StorePageItem $item)
    {
        $this->deleteLocalAsset($item->image_path);
        $item->update(['image_path' => null]);

        return $this->success($this->itemPayload($item), 'Đã xóa ảnh nội dung.');
    }

    public function uploadBranchImage(Request $request, Branch $branch)
    {
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $this->deleteLocalAsset($branch->image_path);
        $path = $request->file('image')->store('store-page/branches/'.$branch->id, 'public');
        $branch->update(['image_path' => $path]);

        return $this->success(['image_path' => Storage::disk('public')->url($path)], 'Đã tải ảnh cửa hàng.', 201);
    }

    public function deleteBranchImage(Branch $branch)
    {
        $this->deleteLocalAsset($branch->image_path);
        $branch->update(['image_path' => null]);

        return $this->success(null, 'Đã xóa ảnh cửa hàng.');
    }

    private function contentPayload(StorePageContent $content): array
    {
        $data = $content->toArray();
        $data['hero_image_path'] = $this->assetUrl($content->hero_image_path);
        $data['contact_image_path'] = $this->assetUrl($content->contact_image_path);
        $data['settings'] = $content->settings_json ?? [];
        unset($data['settings_json'], $data['items']);

        return $data;
    }

    private function itemPayload(StorePageItem $item): array
    {
        $data = $item->toArray();
        $data['image_path'] = $this->assetUrl($item->image_path);

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
