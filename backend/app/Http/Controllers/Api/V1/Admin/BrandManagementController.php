<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BrandManagementController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->success(Brand::latest()->paginate(20));
    }

    public function store(Request $request)
    {
        $brand = Brand::create($this->brandData($request));

        return $this->success($brand, 'Tạo thương hiệu thành công.', 201);
    }

    public function update(Request $request, Brand $brand)
    {
        $brand->update($this->brandData($request, $brand));

        return $this->success($brand->refresh(), 'Cập nhật thương hiệu thành công.');
    }

    public function destroy(Brand $brand)
    {
        $brand->delete();

        return $this->success(null, 'Đã xóa thương hiệu.');
    }

    private function brandData(Request $request, ?Brand $brand = null): array
    {
        $request->merge([
            'slug' => $request->filled('slug')
                ? Str::slug($request->string('slug'))
                : ($brand?->slug ?? Str::slug($request->string('name'))),
        ]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'slug' => ['required', 'string', 'max:190', Rule::unique('brands', 'slug')->ignore($brand?->id)],
            'description' => ['nullable', 'string'],
            'logo_path' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ]);

        if (! $request->exists('logo_path')) {
            unset($data['logo_path']);
        }

        return $data;
    }
}
