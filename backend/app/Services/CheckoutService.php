<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(private InventoryService $inventoryService) {}

    public function preview(User $user, ?string $couponCode = null): array
    {
        $cart = $user->cart()->with('items.variant.product', 'items.variant.inventories')->first();
        if (! $cart || $cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Giỏ hàng đang trống.']);
        }
        $subtotal = 0;
        foreach ($cart->items as $item) {
            if ($item->variant->status !== 'active' || $item->variant->product->status !== 'active') {
                throw ValidationException::withMessages(['cart' => "Sản phẩm {$item->variant->product->name} không còn bán."]);
            }
            if ($item->quantity > $item->variant->availableStock()) {
                throw ValidationException::withMessages(['stock' => "Sản phẩm {$item->variant->product->name} không đủ tồn kho."]);
            }
            $subtotal += $item->variant->currentPrice() * $item->quantity;
        }
        $discount = $this->discount($user, $couponCode, $subtotal);
        $settings = StoreSetting::current();
        $shipping = $subtotal >= (float) $settings->free_shipping_from ? 0 : (float) $settings->shipping_fee;

        return ['cart' => $cart, 'subtotal' => $subtotal, 'discount_amount' => $discount, 'shipping_fee' => $shipping, 'total_amount' => max(0, $subtotal - $discount + $shipping)];
    }

    public function place(User $user, array $payload): Order
    {
        return DB::transaction(function () use ($user, $payload) {
            $summary = $this->preview($user, $payload['coupon_code'] ?? null);
            $branch = Branch::where('is_default', true)->firstOrFail();
            $order = Order::create(array_merge(Arr::except($payload, ['coupon_code']), [
                'order_number' => StoreSetting::current()->order_prefix.now()->format('ymd').strtoupper(Str::random(6)), 'user_id' => $user->id, 'branch_id' => $branch->id,
                'subtotal' => $summary['subtotal'], 'discount_amount' => $summary['discount_amount'], 'shipping_fee' => $summary['shipping_fee'],
                'total_amount' => $summary['total_amount'], 'payment_status' => 'unpaid', 'order_status' => 'pending',
            ]));
            foreach ($summary['cart']->items as $item) {
                $inventory = Inventory::where('branch_id', $branch->id)->where('product_variant_id', $item->product_variant_id)->lockForUpdate()->firstOrFail();
                $this->inventoryService->reserve($inventory, $item->quantity, $user->id);
                $price = $item->variant->currentPrice();
                $order->items()->create([
                    'product_id' => $item->variant->product_id, 'product_variant_id' => $item->variant->id,
                    'product_name' => $item->variant->product->name, 'variant_description' => $item->variant->sku,
                    'sku' => $item->variant->sku, 'barcode' => $item->variant->barcode, 'unit_price' => $price,
                    'quantity' => $item->quantity, 'line_total' => $price * $item->quantity,
                ]);
            }
            if (! empty($payload['coupon_code']) && $summary['discount_amount'] > 0) {
                $coupon = Coupon::where('code', strtoupper($payload['coupon_code']))->lockForUpdate()->first();
                $coupon?->increment('used_count');
                DB::table('coupon_usages')->insert(['coupon_id' => $coupon->id, 'user_id' => $user->id, 'order_id' => $order->id, 'discount_amount' => $summary['discount_amount'], 'created_at' => now()]);
            }
            $summary['cart']->items()->delete();

            return $order->load('items');
        });
    }

    private function discount(User $user, ?string $code, float $subtotal): float
    {
        if (! $code) {
            return 0;
        }
        $coupon = Coupon::where('code', strtoupper($code))->where('is_active', true)->first();
        if (! $coupon || ($coupon->starts_at && $coupon->starts_at->isFuture()) || ($coupon->expires_at && $coupon->expires_at->isPast())) {
            throw ValidationException::withMessages(['coupon_code' => 'Mã giảm giá không hợp lệ hoặc đã hết hạn.']);
        }
        if ($coupon->minimum_order_amount && $subtotal < $coupon->minimum_order_amount) {
            throw ValidationException::withMessages(['coupon_code' => 'Đơn hàng chưa đạt giá trị tối thiểu của mã giảm giá.']);
        }
        if ($coupon->usage_limit && $coupon->used_count >= $coupon->usage_limit) {
            throw ValidationException::withMessages(['coupon_code' => 'Mã giảm giá đã hết lượt sử dụng.']);
        }
        $discount = $coupon->type === 'percentage' ? $subtotal * ((float) $coupon->value / 100) : (float) $coupon->value;

        return min($discount, (float) ($coupon->maximum_discount_amount ?? $discount), $subtotal);
    }
}
