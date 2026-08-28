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
            'warranty_days' => $this->warranty_days,
            'video_path' => $this->video_path ? (str_starts_with($this->video_path, '/') || str_starts_with($this->video_path, 'http') ? $this->video_path : Storage::disk('public')->url($this->video_path)) : null,
            'status' => $this->status,
            'is_featured' => $this->is_featured,
            'is_new' => $this->is_new,
            'category' => $this->whenLoaded('category'),
            'brand' => $this->whenLoaded('brand'),
            'images' => $this->whenLoaded('images', fn () => $this->images->sortByDesc('is_primary')->values()->map(fn ($image) => [
                'id' => $image->id,
                'product_variant_id' => $image->product_variant_id,
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
                    'attribute_code' => $value->relationLoaded('attribute') ? $value->attribute->code : null,
                    'attribute_name' => $value->relationLoaded('attribute') ? $value->attribute->name : null,
                    'value_id' => $value->id,
                    'value' => $value->display_value,
                    'option_code' => $value->option_code,
                ]) : [],
            ])),
            'price_min' => $this->whenLoaded('variants', fn () => (float) ($this->variants->min(fn ($variant) => $variant->currentPrice()) ?? 0)),
            'price_max' => $this->whenLoaded('variants', fn () => (float) ($this->variants->max(fn ($variant) => $variant->currentPrice()) ?? 0)),
            'available_stock' => $this->whenLoaded('variants', fn () => (int) $this->variants->sum(fn ($variant) => $variant->availableStock())),
            'best_listing_variant' => $this->whenLoaded('variants', function () {
                $variants = $this->variants->sortBy(fn ($variant) => [$variant->availableStock() > 0 ? 0 : 1, $variant->currentPrice()]);
                $variant = $variants->first();

                return $variant ? ['id' => $variant->id, 'current_price' => $variant->currentPrice(), 'stock' => $variant->availableStock()] : null;
            }),
            'rating_average' => round((float) ($this->reviews_avg_rating ?? 0), 1),
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'sold_count' => (int) ($this->sold_count ?? 0),
            'promotions' => $this->whenLoaded('promotions', fn () => $this->promotions->map(fn ($promotion) => [
                'id' => $promotion->id,
                'title' => $promotion->title,
                'slug' => $promotion->slug,
                'excerpt' => $promotion->excerpt,
                'badge' => $promotion->promotion_badge,
                'conditions' => $promotion->promotion_conditions,
                'starts_at' => $promotion->promotion_starts_at,
                'ends_at' => $promotion->promotion_ends_at,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
