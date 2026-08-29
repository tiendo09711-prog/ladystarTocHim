<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function __construct(private InventoryService $inventoryService, private PaymentService $paymentService) {}

    public function preview(User $user, ?string $couponCode = null): array
    {
        return $this->publicSummary($this->authenticatedSummary($user, $couponCode));
    }

    public function previewGuest(array $items, ?string $couponCode = null): array
    {
        return $this->publicSummary($this->guestSummary($items, $couponCode));
    }

    public function place(User $user, array $payload): Order
    {
        return DB::transaction(function () use ($user, $payload) {
            $summary = $this->authenticatedSummary($user, $payload['coupon_code'] ?? null);
            $order = $this->createOrder($summary, $payload, $user);
            $summary['cart']->items()->delete();

            return $order;
        });
    }

    public function placeGuest(array $payload): Order
    {
        return DB::transaction(function () use ($payload) {
            $summary = $this->guestSummary($payload['items'], $payload['coupon_code'] ?? null);

            return $this->createOrder($summary, $payload, null);
        });
    }

    private function authenticatedSummary(User $user, ?string $couponCode): array
    {
        $cart = $user->cart()->with('items.variant.product', 'items.variant.attributeValues.attribute', 'items.variant.inventories')->first();
        if (! $cart || $cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Giỏ hàng đang trống.']);
        }
        $lines = $cart->items->map(fn ($item) => ['variant' => $item->variant, 'quantity' => (int) $item->quantity]);

        return $this->summarize($lines, $user, $couponCode) + ['cart' => $cart];
    }

    private function guestSummary(array $items, ?string $couponCode): array
    {
        $variantIds = collect($items)->pluck('product_variant_id')->map(fn ($id) => (int) $id)->values();
        $variants = ProductVariant::with('product', 'attributeValues.attribute', 'inventories')->whereIn('id', $variantIds)->get()->keyBy('id');
        if ($variants->count() !== $variantIds->unique()->count()) {
            throw ValidationException::withMessages(['items' => 'Giỏ hàng chứa biến thể không hợp lệ.']);
        }
        $lines = collect($items)->map(fn ($item) => ['variant' => $variants[(int) $item['product_variant_id']], 'quantity' => (int) $item['quantity']]);

        return $this->summarize($lines, null, $couponCode);
    }

    private function summarize(Collection $lines, ?User $user, ?string $couponCode): array
    {
        $branch = Branch::where('is_default', true)->firstOrFail();
        $subtotal = 0;
        foreach ($lines as $line) {
            $variant = $line['variant'];
            if ($variant->status !== 'active' || $variant->product->status !== 'active') {
                throw ValidationException::withMessages(['items' => 'Sản phẩm không còn bán.']);
            }
            $inventory = $variant->inventories->firstWhere('branch_id', $branch->id);
            $available = $inventory ? $inventory->quantity_on_hand - $inventory->quantity_reserved : 0;
            if ($line['quantity'] > $available) {
                throw ValidationException::withMessages(['stock' => 'Sản phẩm không đủ tồn kho.']);
            }
            $subtotal += $variant->currentPrice() * $line['quantity'];
        }
        $discount = $this->discount($user, $couponCode, $subtotal);
        $settings = StoreSetting::current();
        $shipping = $subtotal >= (float) $settings->free_shipping_from ? 0 : (float) $settings->shipping_fee;

        return ['branch' => $branch, 'lines' => $lines, 'subtotal' => $subtotal, 'discount_amount' => $discount, 'shipping_fee' => $shipping, 'total_amount' => max(0, $subtotal - $discount + $shipping)];
    }

    private function createOrder(array $summary, array $payload, ?User $user): Order
    {
        $settings = StoreSetting::current();
        if (($payload['payment_method'] ?? 'cod') === 'bank_transfer' && ! $settings->bank_transfer_enabled) {
            throw ValidationException::withMessages(['payment_method' => 'Chuyển khoản ngân hàng hiện không khả dụng.']);
        }
        $order = Order::create(array_merge(Arr::except($payload, ['items', 'coupon_code']), [
            'order_number' => $settings->order_prefix.now()->format('ymd').strtoupper(Str::random(6)),
            'user_id' => $user?->id,
            'branch_id' => $summary['branch']->id,
            'subtotal' => $summary['subtotal'],
            'discount_amount' => $summary['discount_amount'],
            'shipping_fee' => $summary['shipping_fee'],
            'total_amount' => $summary['total_amount'],
            'payment_status' => 'unpaid',
            'order_status' => 'pending',
            'expires_at' => now()->addMinutes(config('orders.pending_expiry_minutes', 30)),
        ]));

        foreach ($summary['lines'] as $line) {
            $this->createOrderItem($order, $summary['branch'], $line, $user);
        }
        $this->recordCouponUsage($order, $payload, $summary, $user);
        $order->statusHistories()->create([
            'from_status' => null,
            'to_status' => 'pending',
            'changed_by' => $user?->id,
            'note' => 'Đơn hàng được tạo.',
            'created_at' => now(),
        ]);
        $this->paymentService->createForOrder($order);

        return $order->load('items', 'payment', 'statusHistories');
    }

    private function createOrderItem(Order $order, Branch $branch, array $line, ?User $user): void
    {
        $variant = $line['variant'];
        $inventory = Inventory::where('branch_id', $branch->id)->where('product_variant_id', $variant->id)->lockForUpdate()->firstOrFail();
        $this->inventoryService->reserve($inventory, $line['quantity'], $user?->id, $order);
        $price = $variant->currentPrice();
        $snapshot = $this->variantSnapshot($variant);
        $description = collect($snapshot)->map(function ($item) {
            return $item['attribute_name'].': '.$item['value'].($item['option_code'] ? ' ('.$item['option_code'].')' : '');
        })->implode(' · ') ?: $variant->sku;
        $order->items()->create([
            'product_id' => $variant->product_id,
            'product_variant_id' => $variant->id,
            'product_name' => $variant->product->name,
            'variant_description' => $description,
            'variant_snapshot' => $snapshot,
            'warranty_days_snapshot' => $variant->product->warranty_days,
            'sku' => $variant->sku,
            'barcode' => $variant->barcode,
            'unit_price' => $price,
            'cost_price_snapshot' => $variant->cost_price,
            'quantity' => $line['quantity'],
            'line_total' => $price * $line['quantity'],
        ]);
    }

    private function variantSnapshot(ProductVariant $variant): array
    {
        return $variant->attributeValues->sortBy(fn ($value) => [$value->attribute->sort_order, $value->attribute->id, $value->sort_order])->map(fn ($value) => [
            'attribute_code' => $value->attribute->code,
            'attribute_name' => $value->attribute->name,
            'value' => $value->display_value,
            'option_code' => $value->option_code,
        ])->values()->all();
    }

    private function recordCouponUsage(Order $order, array $payload, array $summary, ?User $user): void
    {
        if (empty($payload['coupon_code']) || $summary['discount_amount'] <= 0) {
            return;
        }
        $coupon = Coupon::where('code', strtoupper($payload['coupon_code']))->lockForUpdate()->firstOrFail();
        if ($coupon->usage_limit && $coupon->used_count >= $coupon->usage_limit) {
            throw ValidationException::withMessages(['coupon_code' => 'Mã giảm giá đã hết lượt sử dụng.']);
        }
        if ($coupon->usage_limit_per_user && $user) {
            $used = DB::table('coupon_usages')->where('coupon_id', $coupon->id)->where('user_id', $user->id)->count();
            if ($used >= $coupon->usage_limit_per_user) {
                throw ValidationException::withMessages(['coupon_code' => 'Bạn đã sử dụng hết lượt của mã giảm giá này.']);
            }
        }
        $coupon->increment('used_count');
        DB::table('coupon_usages')->insert([
            'coupon_id' => $coupon->id,
            'user_id' => $user?->id,
            'order_id' => $order->id,
            'discount_amount' => $summary['discount_amount'],
            'created_at' => now(),
        ]);
    }

    private function discount(?User $user, ?string $code, float $subtotal): float
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
        if ($coupon->usage_limit_per_user) {
            if (! $user) {
                throw ValidationException::withMessages(['coupon_code' => 'Mã giảm giá này chỉ áp dụng cho khách hàng đã đăng nhập.']);
            }
            $used = DB::table('coupon_usages')->where('coupon_id', $coupon->id)->where('user_id', $user->id)->count();
            if ($used >= $coupon->usage_limit_per_user) {
                throw ValidationException::withMessages(['coupon_code' => 'Bạn đã sử dụng hết lượt của mã giảm giá này.']);
            }
        }
        $discount = $coupon->type === 'percentage' ? $subtotal * ((float) $coupon->value / 100) : (float) $coupon->value;

        return min($discount, (float) ($coupon->maximum_discount_amount ?? $discount), $subtotal);
    }

    private function publicSummary(array $summary): array
    {
        return Arr::only($summary, ['subtotal', 'discount_amount', 'shipping_fee', 'total_amount']);
    }
}
