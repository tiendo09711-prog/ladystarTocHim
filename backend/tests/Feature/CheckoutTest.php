<?php

namespace Tests\Feature;

use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_cart_and_checkout_recalculate_price_and_reserve_stock(): void
    {
        $this->seed();
        $user = User::where('email', 'user@namhair.local')->firstOrFail();
        $variant = ProductVariant::with('inventories')->firstOrFail();
        $price = $variant->currentPrice();
        $this->actingAs($user)->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 2])->assertCreated()->assertJsonPath('data.subtotal', (int) ($price * 2));
        $response = $this->actingAs($user)->postJson('/api/v1/checkout/place-order', [
            'customer_name' => $user->name, 'customer_email' => $user->email, 'customer_phone' => $user->phone,
            'province' => 'TP. Hồ Chí Minh', 'district' => 'Quận 1', 'ward' => 'Bến Nghé', 'shipping_address' => '10 Nguyễn Huệ',
            'payment_method' => 'cod', 'coupon_code' => 'NAMHAIR10',
        ]);
        $response->assertCreated()->assertJsonPath('success', true)->assertJsonPath('data.items.0.unit_price', (int) $price);
        $this->assertDatabaseHas('orders', ['user_id' => $user->id, 'order_status' => 'pending']);
        $this->assertDatabaseHas('inventories', ['product_variant_id' => $variant->id, 'quantity_reserved' => 2]);
        $this->assertDatabaseMissing('cart_items', ['product_variant_id' => $variant->id]);
    }
}
