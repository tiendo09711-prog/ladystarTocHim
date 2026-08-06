<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'base_sku' => $this->base_sku,
            'short_description' => $this->short_description,
            'description' => $this->description,
            'material' => $this->material,
            'base_type' => $this->base_type,
            'origin' => $this->origin,
            'estimated_lifespan' => $this->estimated_lifespan,
            'usage_instructions' => $this->usage_instructions,
            'care_instructions' => $this->care_instructions,
            'warranty_information' => $this->warranty_information,
            'status' => $this->status,
            'is_featured' => $this->is_featured,
            'is_new' => $this->is_new,
            'category' => $this->whenLoaded('category'),
            'brand' => $this->whenLoaded('brand'),
            'images' => $this->whenLoaded('images', fn () => $this->images->sortByDesc('is_primary')->values()->map(fn ($image) => [
                'id' => $image->id,
                'image_path' => str_starts_with($image->image_path, '/') || str_starts_with($image->image_path, 'http') ? $image->image_path : Storage::disk('public')->url($image->image_path),
                'alt_text' => $image->alt_text,
                'is_primary' => $image->is_primary,
                'sort_order' => $image->sort_order,
            ])),
            'variants' => $this->whenLoaded('variants', fn () => $this->variants->map(fn ($variant) => [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'barcode' => $variant->barcode,
                'price' => (float) $variant->price,
                'sale_price' => $variant->sale_price !== null ? (float) $variant->sale_price : null,
                'cost_price' => $variant->cost_price !== null ? (float) $variant->cost_price : null,
                'weight' => $variant->weight !== null ? (float) $variant->weight : null,
                'current_price' => $variant->currentPrice(),
                'status' => $variant->status,
                'stock' => $variant->availableStock(),
                'attributes' => $variant->relationLoaded('attributeValues') ? $variant->attributeValues->map(fn ($value) => [
                    'attribute_id' => $value->pivot->attribute_id,
                    'value_id' => $value->id,
                    'value' => $value->display_value,
                ]) : [],
            ])),
            'rating_average' => round((float) ($this->reviews_avg_rating ?? 0), 1),
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'created_at' => $this->created_at,
        ];
    }
}
