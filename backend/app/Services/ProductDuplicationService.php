<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductDuplicationService
{
    public function __construct(private AuditLogService $audit) {}

    public function duplicate(Product $source, User $actor): Product
    {
        $source->loadMissing('images', 'variants.attributeValues');

        return DB::transaction(function () use ($source, $actor) {
            $product = $source->replicate(['slug', 'base_sku', 'status', 'published_at']);
            $product->name = '[Bản sao] '.$source->name;
            $product->slug = $this->unique('products', 'slug', Str::slug($source->slug.'-ban-sao'));
            $product->base_sku = $this->unique('products', 'base_sku', Str::limit($source->base_sku.'-COPY', 240, ''));
            $product->status = 'draft';
            $product->published_at = null;
            $product->is_featured = false;
            $product->is_new = false;
            $product->save();

            $variantMap = [];
            foreach ($source->variants as $sourceVariant) {
                $variant = $sourceVariant->replicate(['sku', 'barcode']);
                $variant->product_id = $product->id;
                $variant->sku = $this->unique('product_variants', 'sku', Str::limit($sourceVariant->sku.'-COPY', 240, ''));
                $variant->barcode = null;
                $variant->status = 'inactive';
                $variant->save();
                $variantMap[$sourceVariant->id] = $variant->id;
                $variant->attributeValues()->sync($sourceVariant->attributeValues->mapWithKeys(fn ($value) => [$value->id => ['attribute_id' => $value->pivot->attribute_id]])->all());
            }

            foreach ($source->images as $image) {
                $copy = $image->replicate();
                $copy->product_id = $product->id;
                $copy->product_variant_id = $image->product_variant_id ? ($variantMap[$image->product_variant_id] ?? null) : null;
                $copy->save();
            }

            $this->audit->record('product.duplicated', 'products', $product, null, ['source_product_id' => $source->id, 'new_product_id' => $product->id], [], $actor);

            return $product->load('category', 'brand', 'images', 'variants.attributeValues.attribute', 'variants.inventories');
        });
    }

    private function unique(string $table, string $column, string $base): string
    {
        $candidate = $base;
        $suffix = 2;
        while (DB::table($table)->where($column, $candidate)->exists()) {
            $candidate = Str::limit($base, 235, '').'-'.$suffix++;
        }

        return $candidate;
    }
}
