<?php

namespace App\Http\Requests\Admin;

use App\Models\AttributeValue;
use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAccessAdmin() === true;
    }

    public function rules(): array
    {
        $productId = $this->route('product')?->id ?? $this->route('product');

        return [
            'name' => ['required', 'string', 'max:190'],
            'slug' => ['required', 'alpha_dash', Rule::unique('products', 'slug')->ignore($productId)],
            'base_sku' => ['required', 'max:80', Rule::unique('products', 'base_sku')->ignore($productId)],
            'category_id' => ['required', Rule::exists('categories', 'id')->where(fn ($query) => $query->where('is_active', true))],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'short_description' => ['nullable', 'string'],
            'description' => ['required', 'string'],
            'material' => ['nullable', 'string', 'max:190'],
            'base_type' => ['nullable', 'string', 'max:190'],
            'origin' => ['nullable', 'string', 'max:190'],
            'estimated_lifespan' => ['nullable', 'string', 'max:190'],
            'usage_instructions' => ['nullable', 'string'],
            'care_instructions' => ['nullable', 'string'],
            'warranty_information' => ['nullable', 'string'],
            'warranty_days' => ['nullable', 'integer', 'min:0', 'max:36500'],
            'status' => ['required', Rule::in(['draft', 'active', 'inactive'])],
            'is_featured' => ['boolean'],
            'is_new' => ['boolean'],
            'variants' => ['required', 'array', 'min:1'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.sku' => ['required', 'string', 'distinct'],
            'variants.*.barcode' => ['nullable', 'string', 'distinct'],
            'variants.*.price' => ['required', 'numeric', 'min:0'],
            'variants.*.sale_price' => ['nullable', 'numeric', 'min:0', 'lt:variants.*.price'],
            'variants.*.cost_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.weight' => ['nullable', 'numeric', 'min:0'],
            'variants.*.status' => ['required', Rule::in(['active', 'inactive'])],
            'variants.*.attribute_value_ids' => ['sometimes', 'array'],
            'variants.*.attribute_value_ids.*' => ['integer', 'exists:attribute_values,id'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            $signatures = [];
            $attributeSets = [];
            foreach ($this->input('variants', []) as $index => $variant) {
                $skuQuery = ProductVariant::withTrashed()->where('sku', $variant['sku'] ?? '');
                if (! empty($variant['id'])) {
                    $skuQuery->whereKeyNot($variant['id']);
                }
                if ($skuQuery->exists()) {
                    $validator->errors()->add('variants.'.$index.'.sku', 'SKU biến thể đã tồn tại.');
                }

                if (! empty($variant['barcode'])) {
                    $barcodeQuery = ProductVariant::withTrashed()->where('barcode', $variant['barcode']);
                    if (! empty($variant['id'])) {
                        $barcodeQuery->whereKeyNot($variant['id']);
                    }
                    if ($barcodeQuery->exists()) {
                        $validator->errors()->add('variants.'.$index.'.barcode', 'Barcode đã tồn tại.');
                    }
                }

                $valueIds = $variant['attribute_value_ids'] ?? [];
                $attributeIds = AttributeValue::whereKey($valueIds)->pluck('attribute_id');
                if ($attributeIds->count() !== count($valueIds) || $attributeIds->count() !== $attributeIds->unique()->count()) {
                    $validator->errors()->add('variants.'.$index.'.attribute_value_ids', 'Mỗi thuộc tính chỉ được chọn một giá trị hợp lệ.');
                }

                $signature = collect($valueIds)->map(fn ($id) => (int) $id)->sort()->implode('|') ?: 'none';
                if (isset($signatures[$signature])) {
                    $validator->errors()->add('variants.'.$index.'.attribute_value_ids', 'Tổ hợp thuộc tính biến thể đã tồn tại trong sản phẩm.');
                }
                $signatures[$signature] = $index;
                $attributeSets[] = $attributeIds->isNotEmpty() ? $attributeIds->unique()->sort()->implode('|') : 'none';
            }

            if (collect($attributeSets)->unique()->count() > 1) {
                $validator->errors()->add('variants', 'Các biến thể hoạt động phải dùng cùng nhóm thuộc tính.');
            }
        }];
    }
}
