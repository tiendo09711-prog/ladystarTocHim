<?php

namespace Tests\Feature;

use App\Models\OrderItem;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_checkout_recalculates_price_and_saves_variant_snapshot(): void
    {
        $this->seed();
        $variant = ProductVariant::with('attributeValues.attribute', 'inventories')->firstOrFail();
        $payload = $this->payload($variant->id, 1) + ['unit_price' => 1];
        $response = $this->postJson('/api/v1/guest-checkout/place-order', $payload)->assertCreated();
        $response->assertJsonPath('data.user_id', null);
        $item = OrderItem::where('order_id', $response->json('data.id'))->firstOrFail();
        $this->assertSame($variant->currentPrice(), (float) $item->unit_price);
        $this->assertNotEmpty($item->variant_snapshot);
        $oldSnapshot = $item->variant_snapshot;
        $variant->attributeValues->first()->update(['display_value' => 'Tên mới']);
        $this->assertSame($oldSnapshot, $item->refresh()->variant_snapshot);
        $this->assertDatabaseHas('inventories', ['product_variant_id' => $variant->id, 'quantity_reserved' => 1]);
    }

    public function test_guest_checkout_rejects_out_of_stock_without_creating_order(): void
    {
        $this->seed();
        $variant = ProductVariant::with('inventories')->firstOrFail();
        $before = \App\Models\Order::count();
        $this->postJson('/api/v1/guest-checkout/place-order', $this->payload($variant->id, $variant->availableStock() + 1))->assertUnprocessable();
        $this->assertSame($before, \App\Models\Order::count());
    }

    private function payload(int $variantId, int $quantity): array
    {
        return [
            'items' => [['product_variant_id' => $variantId, 'quantity' => $quantity]],
            'customer_name' => 'Khách vãng lai', 'customer_email' => 'guest@example.com', 'customer_phone' => '0900000000',
            'province' => 'TP. Hồ Chí Minh', 'district' => 'Quận 1', 'ward' => 'Bến Nghé',
            'shipping_address' => '10 Nguyễn Huệ', 'payment_method' => 'cod',
        ];
    }
}
