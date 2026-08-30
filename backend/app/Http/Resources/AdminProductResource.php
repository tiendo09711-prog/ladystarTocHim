<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AdminProductResource extends ProductResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);

        if ($this->relationLoaded('variants')) {
            $costs = $this->variants->keyBy('id');
            $data['variants'] = collect($data['variants'])->map(function (array $variant) use ($costs) {
                $model = $costs->get($variant['id']);

                return $variant + ['cost_price' => $model?->cost_price !== null ? (float) $model->cost_price : null];
            });
        }

        return $data;
    }
}
