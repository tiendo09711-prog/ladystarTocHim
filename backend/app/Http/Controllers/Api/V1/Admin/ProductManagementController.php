<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\AttributeValue;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductManagementController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $products = Product::with('category', 'brand', 'images', 'variants.inventories')->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->input('search').'%')->orWhere('base_sku', 'like', '%'.$request->input('search').'%'))->latest()->paginate(15);

        return $this->success(ProductResource::collection($products)->response()->getData(true));
    }

    public function show(Product $product)
    {
        return $this->success(new ProductResource($product->load('category', 'brand', 'images', 'variants.attributeValues', 'variants.inventories')));
    }

    public function store(ProductRequest $request)
    {
        $product = DB::transaction(function () use ($request) {
            $data = $request->safe()->except('variants');
            $data['published_at'] = $data['status'] === 'active' ? now() : null;
            $product = Product::create($data);
            foreach ($request->validated('variants') as $variantData) {
                $attributeValueIds = $variantData['attribute_value_ids'] ?? [];
                unset($variantData['attribute_value_ids'], $variantData['id']);
                $variant = $product->variants()->create($variantData);
                $this->syncVariantAttributes($variant, $attributeValueIds);
            }

            return $product;
        });

        return $this->success(new ProductResource($product->load('category', 'brand', 'images', 'variants.inventories')), 'Tạo sản phẩm thành công.', 201);
    }

    public function update(ProductRequest $request, Product $product)
    {
        DB::transaction(function () use ($request, $product) {
            $data = $request->safe()->except('variants');
            if ($data['status'] === 'active' && ! $product->published_at) {
                $data['published_at'] = now();
            }
            $product->update($data);
            $keptVariantIds = [];
            foreach ($request->validated('variants') as $variantData) {
                $attributeValueIds = $variantData['attribute_value_ids'] ?? [];
                unset($variantData['attribute_value_ids']);
                $variant = isset($variantData['id']) ? $product->variants()->findOrFail($variantData['id']) : $product->variants()->make();
                unset($variantData['id']);
                $variant->fill($variantData)->save();
                $this->syncVariantAttributes($variant, $attributeValueIds);
                $keptVariantIds[] = $variant->id;
            }
            $product->variants()->whereNotIn('id', $keptVariantIds)->delete();
        });

        return $this->success(new ProductResource($product->refresh()->load('category', 'brand', 'images', 'variants.inventories')), 'Cập nhật sản phẩm thành công.');
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return $this->success(null, 'Đã xóa mềm sản phẩm.');
    }

    public function status(Request $request, Product $product)
    {
        $product->update($request->validate(['status' => ['required', Rule::in(['draft', 'active', 'inactive'])]]));

        return $this->success($product);
    }

    public function uploadImages(Request $request, Product $product)
    {
        $data = $request->validate(['images' => ['required', 'array', 'max:10'], 'images.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096']]);
        abort_if($product->images()->count() + count($data['images']) > 10, 422, 'Mỗi sản phẩm chỉ được tối đa 10 ảnh.');
        $created = [];
        foreach ($data['images'] as $index => $image) {
            $path = $image->storePubliclyAs('products/'.$product->id, Str::uuid().'.'.$image->extension(), 'public');
            $created[] = $product->images()->create(['image_path' => $path, 'alt_text' => $product->name, 'sort_order' => $product->images()->count() + $index, 'is_primary' => ! $product->images()->exists()]);
        }

        return $this->success($created, 'Tải ảnh thành công.', 201);
    }

    public function deleteImage(Product $product, ProductImage $image)
    {
        abort_unless($image->product_id === $product->id, 404);
        $wasPrimary = $image->is_primary;
        if (! str_starts_with($image->image_path, '/')) {
            Storage::disk('public')->delete($image->image_path);
        }
        $image->delete();
        if ($wasPrimary) {
            $product->images()->orderBy('sort_order')->first()?->update(['is_primary' => true]);
        }

        return $this->success(null);
    }

    public function primaryImage(Product $product, ProductImage $image)
    {
        abort_unless($image->product_id === $product->id, 404);
        DB::transaction(function () use ($product, $image) {
            $product->images()->update(['is_primary' => false]);
            $image->refresh()->update(['is_primary' => true]);
        });

        return $this->success($image->refresh());
    }

    public function storeVariant(Request $request, Product $product)
    {
        $data = $this->variantData($request);
        $attributeValueIds = $data['attribute_value_ids'] ?? [];
        unset($data['attribute_value_ids']);
        $variant = $product->variants()->create($data);
        $this->syncVariantAttributes($variant, $attributeValueIds);

        return $this->success($variant, 'Tạo biến thể thành công.', 201);
    }

    public function updateVariant(Request $request, Product $product, ProductVariant $variant)
    {
        abort_unless($variant->product_id === $product->id, 404);
        $data = $this->variantData($request, $variant);
        $attributeValueIds = $data['attribute_value_ids'] ?? [];
        unset($data['attribute_value_ids']);
        $variant->update($data);
        $this->syncVariantAttributes($variant, $attributeValueIds);

        return $this->success($variant);
    }

    public function deleteVariant(Product $product, ProductVariant $variant)
    {
        abort_unless($variant->product_id === $product->id, 404);
        $variant->delete();

        return $this->success(null);
    }

    private function variantData(Request $request, ?ProductVariant $variant = null): array
    {
        return $request->validate(['sku' => ['required', Rule::unique('product_variants')->ignore($variant)], 'barcode' => ['nullable', Rule::unique('product_variants')->ignore($variant)], 'price' => ['required', 'numeric', 'min:0'], 'sale_price' => ['nullable', 'numeric', 'min:0', 'lt:price'], 'cost_price' => ['nullable', 'numeric', 'min:0'], 'weight' => ['nullable', 'numeric', 'min:0'], 'status' => ['required', Rule::in(['active', 'inactive'])], 'attribute_value_ids' => ['sometimes', 'array'], 'attribute_value_ids.*' => ['integer', 'distinct', 'exists:attribute_values,id']]);
    }

    private function syncVariantAttributes(ProductVariant $variant, array $attributeValueIds): void
    {
        $values = AttributeValue::whereKey($attributeValueIds)->get();
        $variant->attributeValues()->sync($values->mapWithKeys(fn ($value) => [$value->id => ['attribute_id' => $value->attribute_id]])->all());
    }
}
