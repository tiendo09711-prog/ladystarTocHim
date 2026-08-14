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
use Illuminate\Validation\ValidationException;

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
        return $this->success(new ProductResource($product->load('category', 'brand', 'images', 'variants.attributeValues.attribute', 'variants.inventories')));
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
        $data = $request->validate(['images' => ['required', 'array', 'max:10'], 'images.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'], 'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id']]);
        $this->assertVariantBelongsToProduct($product, $data['product_variant_id'] ?? null);
        abort_if($product->images()->count() + count($data['images']) > 10, 422, 'Mỗi sản phẩm chỉ được tối đa 10 ảnh.');
        $created = [];
        foreach ($data['images'] as $index => $image) {
            $path = $image->storePubliclyAs('products/'.$product->id, Str::uuid().'.'.$image->extension(), 'public');
            $created[] = $product->images()->create(['product_variant_id' => $data['product_variant_id'] ?? null, 'image_path' => $path, 'alt_text' => $product->name, 'sort_order' => $product->images()->count() + $index, 'is_primary' => ! $product->images()->exists()]);
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

    public function updateImage(Request $request, Product $product, ProductImage $image)
    {
        abort_unless($image->product_id === $product->id, 404);
        $data = $request->validate(['alt_text' => ['nullable', 'string', 'max:190'], 'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id']]);
        $this->assertVariantBelongsToProduct($product, $data['product_variant_id'] ?? null);
        $image->update($data);

        return $this->success($image->refresh());
    }

    public function reorderImages(Request $request, Product $product)
    {
        $data = $request->validate(['order' => ['required', 'array', 'min:1'], 'order.*' => ['integer', 'distinct']]);
        $ids = $product->images()->pluck('id')->all();
        abort_unless(count($ids) === count($data['order']) && ! array_diff($ids, $data['order']), 422, 'Danh sách ảnh không hợp lệ.');
        DB::transaction(function () use ($data, $product) {
            foreach ($data['order'] as $index => $id) $product->images()->whereKey($id)->update(['sort_order' => $index]);
        });

        return $this->success($product->images()->orderBy('sort_order')->get());
    }

    public function storeVariant(Request $request, Product $product)
    {
        $data = $this->variantData($request);
        $attributeValueIds = $data['attribute_value_ids'] ?? [];
        unset($data['attribute_value_ids']);
        $variant = DB::transaction(function () use ($product, $data, $attributeValueIds) {
            $variant = $product->variants()->create($data);
            $this->syncVariantAttributes($variant, $attributeValueIds);
            $this->assertUniqueCombination($product, $attributeValueIds, $variant);

            return $variant;
        });

        return $this->success($variant, 'Tạo biến thể thành công.', 201);
    }

    public function updateVariant(Request $request, Product $product, ProductVariant $variant)
    {
        abort_unless($variant->product_id === $product->id, 404);
        $data = $this->variantData($request, $variant);
        $attributeValueIds = $data['attribute_value_ids'] ?? [];
        unset($data['attribute_value_ids']);
        DB::transaction(function () use ($variant, $product, $data, $attributeValueIds) {
            $variant->update($data);
            $this->syncVariantAttributes($variant, $attributeValueIds);
            $this->assertUniqueCombination($product, $attributeValueIds, $variant);
        });

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

    private function assertUniqueCombination(Product $product, array $attributeValueIds, ProductVariant $variant): void
    {
        $signature = collect($attributeValueIds)->map(fn ($id) => (int) $id)->sort()->values()->all();
        $duplicate = $product->variants()->whereKeyNot($variant->id)->with('attributeValues:id')->get()->contains(function ($candidate) use ($signature) {
            return $candidate->attributeValues->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all() === $signature;
        });
        if ($duplicate) {
            throw ValidationException::withMessages(['attribute_value_ids' => 'Tổ hợp thuộc tính biến thể đã tồn tại trong sản phẩm.']);
        }
    }

    private function assertVariantBelongsToProduct(Product $product, ?int $variantId): void
    {
        if ($variantId && ! $product->variants()->whereKey($variantId)->exists()) {
            throw ValidationException::withMessages(['product_variant_id' => 'Biến thể ảnh không thuộc sản phẩm hiện tại.']);
        }
    }
}
