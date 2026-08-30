<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BuyAgainService
{
    public function __construct(private CartService $cart) {}

    public function execute(User $user, Order $order): array
    {
        $order->loadMissing('items.variant.inventories', 'items.variant.product');
        $added = [];
        $skipped = [];

        DB::transaction(function () use ($user, $order, &$added, &$skipped) {
            $cart = $user->cart()->firstOrCreate();
            foreach ($order->items as $item) {
                $variant = $item->variant;
                $product = $variant?->product;
                $reason = match (true) {
                    ! $variant || ! $product => 'product_unavailable',
                    $product->status !== 'active' => 'product_inactive',
                    $variant->status !== 'active' => 'variant_inactive',
                    default => null,
                };

                $existingQuantity = $variant ? (int) ($cart->items()->where('product_variant_id', $variant->id)->value('quantity') ?? 0) : 0;
                if (! $reason && $existingQuantity + $item->quantity > $variant->availableStock()) {
                    $reason = 'insufficient_stock';
                }
                if ($reason) {
                    $skipped[] = ['order_item_id' => $item->id, 'product_name' => $item->product_name, 'sku' => $item->sku, 'quantity' => (int) $item->quantity, 'reason' => $reason];
                    continue;
                }

                $this->cart->add($user, $variant, (int) $item->quantity);
                $added[] = ['order_item_id' => $item->id, 'product_id' => $product->id, 'product_variant_id' => $variant->id, 'product_name' => $product->name, 'sku' => $variant->sku, 'quantity' => (int) $item->quantity, 'current_price' => $variant->currentPrice()];
            }
        });

        return ['added' => $added, 'skipped' => $skipped, 'cart' => $this->cart->data($user)];
    }
}
