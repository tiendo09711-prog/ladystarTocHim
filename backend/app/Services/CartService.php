<?php

namespace App\Services;

use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class CartService
{
    public function add(User $user, ProductVariant $variant, int $quantity): array
    {
        $variant->loadMissing('inventories', 'product');
        $cart = $user->cart()->firstOrCreate();
        $existing = $cart->items()->where('product_variant_id', $variant->id)->first();
        $nextQuantity = $quantity + ($existing?->quantity ?? 0);

        if ($variant->status !== 'active' || $variant->product?->status !== 'active') {
            throw ValidationException::withMessages(['product_variant_id' => 'Sản phẩm hoặc phân loại không còn kinh doanh.']);
        }
        if ($nextQuantity > $variant->availableStock()) {
            throw ValidationException::withMessages(['quantity' => 'Số lượng yêu cầu vượt quá tồn kho khả dụng.']);
        }

        $cart->items()->updateOrCreate(
            ['product_variant_id' => $variant->id],
            ['quantity' => $nextQuantity, 'unit_price' => $variant->currentPrice()],
        );

        return $this->data($user);
    }

    public function data(User $user): array
    {
        $cart = $user->cart()->with('items.variant.product.images', 'items.variant.attributeValues.attribute', 'items.variant.inventories')->first();
        $items = $cart?->items ?? collect();

        return [
            'items' => $items->map(fn ($item) => [
                'id' => $item->id,
                'product_variant_id' => $item->product_variant_id,
                'quantity' => (int) $item->quantity,
                'unit_price' => $item->variant->currentPrice(),
                'variant' => [
                    'id' => $item->variant->id,
                    'sku' => $item->variant->sku,
                    'price' => (float) $item->variant->price,
                    'sale_price' => $item->variant->sale_price !== null ? (float) $item->variant->sale_price : null,
                    'current_price' => $item->variant->currentPrice(),
                    'status' => $item->variant->status,
                    'stock' => $item->variant->availableStock(),
                    'attributes' => $item->variant->attributeValues->map(fn ($value) => [
                        'attribute_id' => $value->attribute_id,
                        'attribute_code' => $value->attribute->code,
                        'attribute_name' => $value->attribute->name,
                        'value_id' => $value->id,
                        'value' => $value->display_value,
                        'option_code' => $value->option_code,
                    ])->values(),
                    'product' => $item->variant->product,
                ],
            ])->values(),
            'subtotal' => $items->sum(fn ($item) => $item->variant->currentPrice() * $item->quantity),
            'count' => $items->sum('quantity'),
        ];
    }
}
