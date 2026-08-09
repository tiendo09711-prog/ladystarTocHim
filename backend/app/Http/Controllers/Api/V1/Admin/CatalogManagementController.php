<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Branch;
use App\Models\Category;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CatalogManagementController extends Controller
{
    use ApiResponse;

    public function categories()
    {
        return $this->success(Category::with('children')->orderBy('sort_order')->get());
    }

    public function showCategory(Category $category)
    {
        return $this->success($category->load('children'));
    }

    public function storeCategory(Request $request)
    {
        $category = Category::create($this->categoryData($request));

        return $this->success($category, 'Tạo danh mục thành công.', 201);
    }

    public function updateCategory(Request $request, Category $category)
    {
        $category->update($this->categoryData($request, $category));

        return $this->success($category, 'Cập nhật danh mục thành công.');
    }

    public function deleteCategory(Category $category)
    {
        if ($category->products()->exists()) {
            throw ValidationException::withMessages(['category' => 'Không thể xóa danh mục đang chứa sản phẩm.']);
        } $category->delete();

        return $this->success(null, 'Đã xóa danh mục.');
    }

    public function categoryStatus(Request $request, Category $category)
    {
        $category->update($request->validate(['is_active' => ['required', 'boolean']]));

        return $this->success($category);
    }

    public function reorderCategories(Request $request)
    {
        $items = $request->validate(['items' => ['required', 'array'], 'items.*.id' => ['required', 'exists:categories,id'], 'items.*.sort_order' => ['required', 'integer', 'min:0']])['items'];
        DB::transaction(fn () => collect($items)->each(fn ($item) => Category::whereKey($item['id'])->update(['sort_order' => $item['sort_order']])));

        return $this->success(null, 'Đã sắp xếp danh mục.');
    }

    public function attributes()
    {
        return $this->success(Attribute::with('values')->get());
    }

    public function storeAttribute(Request $request)
    {
        $attribute = Attribute::create($this->attributeData($request));

        return $this->success($attribute, 'Tạo thuộc tính thành công.', 201);
    }

    public function updateAttribute(Request $request, Attribute $attribute)
    {
        $attribute->update($this->attributeData($request, $attribute));

        return $this->success($attribute);
    }

    public function deleteAttribute(Attribute $attribute)
    {
        $attribute->delete();

        return $this->success(null, 'Đã xóa thuộc tính.');
    }

    public function storeAttributeValue(Request $request, Attribute $attribute)
    {
        $value = $attribute->values()->create($this->attributeValueData($request, $attribute));

        return $this->success($value, 'Tạo giá trị thuộc tính thành công.', 201);
    }

    public function updateAttributeValue(Request $request, Attribute $attribute, AttributeValue $value)
    {
        abort_unless($value->attribute_id === $attribute->id, 404);
        $value->update($this->attributeValueData($request, $attribute, $value));

        return $this->success($value);
    }

    public function deleteAttributeValue(Attribute $attribute, AttributeValue $value)
    {
        abort_unless($value->attribute_id === $attribute->id, 404);
        $value->delete();

        return $this->success(null);
    }

    public function branches()
    {
        return $this->success(Branch::orderByDesc('is_default')->get());
    }

    public function storeBranch(Request $request)
    {
        $branch = DB::transaction(function () use ($request) {
            $data = $this->branchData($request);
            if ($data['is_default'] ?? false) {
                Branch::query()->update(['is_default' => false]);
            }

            return Branch::create($data);
        });

        return $this->success($branch, 'Tạo chi nhánh thành công.', 201);
    }

    public function updateBranch(Request $request, Branch $branch)
    {
        DB::transaction(function () use ($request, $branch) {
            $data = $this->branchData($request, $branch);
            if ($data['is_default'] ?? false) {
                Branch::whereKeyNot($branch->id)->update(['is_default' => false]);
            }
            $branch->update($data);
        });

        return $this->success($branch);
    }

    public function deleteBranch(Branch $branch)
    {
        if ($branch->is_default) {
            throw ValidationException::withMessages(['branch' => 'Không thể xóa chi nhánh mặc định.']);
        }
        if ($branch->inventories()->exists()) {
            throw ValidationException::withMessages(['branch' => 'Không thể xóa chi nhánh đang có dữ liệu tồn kho.']);
        }
        $branch->delete();

        return $this->success(null);
    }

    private function categoryData(Request $request, ?Category $category = null): array
    {
        return $request->validate(['name' => ['required', 'string', 'max:190'], 'slug' => ['required', 'alpha_dash', Rule::unique('categories')->ignore($category)], 'parent_id' => ['nullable', 'exists:categories,id'], 'description' => ['nullable', 'string'], 'image_path' => ['nullable', 'string'], 'is_active' => ['boolean'], 'sort_order' => ['integer', 'min:0']]);
    }

    private function attributeData(Request $request, ?Attribute $attribute = null): array
    {
        return $request->validate(['name' => ['required', 'string'], 'code' => ['required', 'alpha_dash', Rule::unique('attributes')->ignore($attribute)], 'type' => ['required', Rule::in(['select', 'color', 'text'])], 'is_filterable' => ['boolean'], 'is_variant_attribute' => ['boolean'], 'is_active' => ['boolean']]);
    }

    private function attributeValueData(Request $request, Attribute $attribute, ?AttributeValue $value = null): array
    {
        return $request->validate(['value' => ['required', 'string', Rule::unique('attribute_values')->where('attribute_id', $attribute->id)->ignore($value)], 'display_value' => ['required', 'string'], 'color_code' => ['nullable', 'string', 'max:20'], 'sort_order' => ['integer', 'min:0'], 'is_active' => ['boolean']]);
    }

    private function branchData(Request $request, ?Branch $branch = null): array
    {
        $safeUrl = function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_string($value) || $value === '') return;
            $lower = strtolower($value);
            $isHttp = str_starts_with($lower, 'http://') || str_starts_with($lower, 'https://');
            $isRelative = str_starts_with($value, '/') && ! str_starts_with($value, '//');
            if (! $isHttp && ! $isRelative) $fail('URL không hợp lệ.');
        };

        return $request->validate([
            'name' => ['required', 'string'],
            'code' => ['required', 'alpha_dash', Rule::unique('branches')->ignore($branch)],
            'phone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'province' => ['nullable', 'string'],
            'district' => ['nullable', 'string'],
            'ward' => ['nullable', 'string'],
            'address_line' => ['nullable', 'string'],
            'public_description' => ['nullable', 'string', 'max:2000'],
            'opening_hours' => ['nullable', 'string', 'max:190'],
            'image_alt' => ['nullable', 'string', 'max:190'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'booking_url' => ['nullable', 'string', 'max:500', $safeUrl],
            'map_url' => ['nullable', 'string', 'max:500', $safeUrl],
            'show_on_store_page' => ['boolean'],
            'public_sort_order' => ['integer', 'min:0', 'max:999'],
            'is_default' => ['boolean'],
            'is_active' => ['boolean'],
        ]);
    }
}
