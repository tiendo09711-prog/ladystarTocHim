<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ProductDetailResource extends ProductResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);

        $data['variant_options'] = $this->variantOptions();
        $data['reviews'] = $this->relationLoaded('reviews') ? $this->reviews->map(fn ($review) => [
            'id' => $review->id,
            'rating' => (int) $review->rating,
            'title' => $review->title,
            'content' => $review->content,
            'created_at' => $review->created_at,
            'reviewer_name' => $review->relationLoaded('user') ? $review->user?->name : null,
        ])->values() : [];

        return $data;
    }

    private function variantOptions(): Collection
    {
        return $this->variants
            ->flatMap(fn ($variant) => $variant->attributeValues)
            ->filter(fn ($value) => $value->is_active && $value->relationLoaded('attribute') && $value->attribute->is_active)
            ->groupBy(fn ($value) => $value->attribute->id)
            ->map(function (Collection $values) {
                $attribute = $values->first()->attribute;

                return [
                    'id' => $attribute->id,
                    'code' => $attribute->code,
                    'name' => $attribute->name,
                    'display_style' => $attribute->display_style ?: ($attribute->type === 'color' ? 'image_swatches' : 'buttons'),
                    'sort_order' => (int) $attribute->sort_order,
                    'values' => $values->unique('id')->sortBy([['sort_order', 'asc'], ['id', 'asc']])->map(fn ($value) => [
                        'id' => $value->id,
                        'value' => $value->value,
                        'display_value' => $value->display_value,
                        'option_code' => $value->option_code,
                        'description' => $value->description,
                        'color_code' => $value->color_code,
                        'image_path' => $value->image_url,
                        'image_alt' => $value->image_alt,
                    ])->values(),
                ];
            })
            ->sortBy([['sort_order', 'asc'], ['id', 'asc']])
            ->values();
    }
}
