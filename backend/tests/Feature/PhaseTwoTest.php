<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PhaseTwoTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_and_guest_checkout_create_history_and_payment(): void
    {
        $this->seed();
        $user = User::where('email', 'user@namhair.local')->firstOrFail();
        $variant = ProductVariant::firstOrFail();
        $this->actingAs($user)->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 1])->assertCreated();
        $customerOrder = $this->actingAs($user)->postJson('/api/v1/checkout/place-order', $this->checkoutPayload('cod'))->assertCreated();
        $customerOrder->assertJsonPath('data.status_histories.0.to_status', 'pending')->assertJsonPath('data.payment.status', 'pending');

        $guestOrder = $this->postJson('/api/v1/guest-checkout/place-order', $this->guestPayload($variant->id, 'bank_transfer'))->assertCreated();
        $guestOrder->assertJsonPath('data.status_histories.0.changed_by', null)->assertJsonPath('data.payment.method', 'bank_transfer');
        $this->assertDatabaseHas('payments', ['order_id' => $guestOrder->json('data.id'), 'amount' => $guestOrder->json('data.total_amount'), 'status' => 'pending']);
    }

    public function test_guest_tracking_is_generic_safe_and_complete(): void
    {
        $this->seed();
        $variant = ProductVariant::firstOrFail();
        $response = $this->postJson('/api/v1/guest-checkout/place-order', $this->guestPayload($variant->id))->assertCreated();
        $orderNumber = $response->json('data.order_number');

        $this->postJson('/api/v1/orders/track', ['order_number' => $orderNumber, 'phone' => '0900000000'])
            ->assertOk()->assertJsonPath('data.order_number', $orderNumber)->assertJsonPath('data.payment.status', 'pending')
            ->assertJsonMissingPath('data.admin_note');
        $this->postJson('/api/v1/orders/track', ['order_number' => $orderNumber, 'phone' => '0911111111'])
            ->assertNotFound()->assertJsonPath('message', 'Không tìm thấy đơn hàng phù hợp.');
        $this->postJson('/api/v1/orders/track', ['order_number' => 'UNKNOWN', 'phone' => '0900000000'])
            ->assertNotFound()->assertJsonPath('message', 'Không tìm thấy đơn hàng phù hợp.');
    }

    public function test_admin_payment_and_manual_shipment_work_idempotently(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $variant = ProductVariant::firstOrFail();
        $created = $this->postJson('/api/v1/guest-checkout/place-order', $this->guestPayload($variant->id, 'bank_transfer'))->assertCreated();
        $order = Order::findOrFail($created->json('data.id'));

        $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}/status", ['order_status' => 'confirmed'])->assertOk();
        $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}/status", ['order_status' => 'processing'])->assertOk();
        $this->actingAs($admin)->putJson("/api/v1/admin/orders/{$order->id}/shipment", ['carrier' => 'GHN', 'tracking_number' => 'TRACK-001', 'shipping_fee_actual' => 35000])->assertOk();
        $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}/shipment/status", ['status' => 'shipped'])->assertOk();
        $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}/shipment/status", ['status' => 'shipped'])->assertOk();
        $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}/payment-status", ['payment_status' => 'paid', 'transaction_code' => 'BANK-001'])->assertOk();
        $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}/payment-status", ['payment_status' => 'paid'])->assertOk();
        $this->actingAs($admin)->patchJson("/api/v1/admin/orders/{$order->id}/shipment/status", ['status' => 'delivered'])->assertOk();

        $this->assertDatabaseHas('shipments', ['order_id' => $order->id, 'status' => 'delivered', 'tracking_number' => 'TRACK-001']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'order_status' => 'completed', 'payment_status' => 'paid']);
        $this->assertDatabaseHas('payments', ['order_id' => $order->id, 'status' => 'paid', 'verified_by' => $admin->id, 'transaction_code' => 'BANK-001']);
        $this->assertSame(5, $order->statusHistories()->count());
    }

    public function test_public_payment_config_and_admin_qr_are_protected(): void
    {
        $this->seed();
        Storage::fake('public');
        $admin = User::where('role', 'admin')->firstOrFail();
        $user = User::where('role', 'user')->firstOrFail();
        StoreSetting::current()->update(['bank_name' => 'Vietcombank', 'bank_account_number' => '123456']);

        $this->getJson('/api/v1/payment-methods')->assertOk()->assertJsonPath('data.bank_transfer.bank_name', 'Vietcombank')->assertJsonMissingPath('data.store_name');
        $this->actingAs($user)->post('/api/v1/admin/settings/bank-qr', ['image' => UploadedFile::fake()->image('qr.png')], ['Accept' => 'application/json'])->assertForbidden();
        $this->actingAs($admin)->post('/api/v1/admin/settings/bank-qr', ['image' => UploadedFile::fake()->image('qr.png')], ['Accept' => 'application/json'])->assertOk();
        Storage::disk('public')->assertExists(StoreSetting::current()->bank_qr_path);
        $this->actingAs($admin)->post('/api/v1/admin/settings/bank-qr', ['image' => UploadedFile::fake()->create('qr.txt', 2, 'text/plain')], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_bank_transfer_can_be_disabled_and_customer_cannot_manage_payment_or_shipment(): void
    {
        $this->seed();
        $user = User::where('role', 'user')->firstOrFail();
        $variant = ProductVariant::firstOrFail();
        StoreSetting::current()->update(['bank_transfer_enabled' => false]);
        $this->getJson('/api/v1/payment-methods')->assertJsonPath('data.bank_transfer.enabled', false);
        $this->postJson('/api/v1/guest-checkout/place-order', $this->guestPayload($variant->id, 'bank_transfer'))->assertUnprocessable();

        $order = Order::query()->first();
        if ($order) {
            $this->actingAs($user)->patchJson("/api/v1/admin/orders/{$order->id}/payment-status", ['payment_status' => 'paid'])->assertForbidden();
            $this->actingAs($user)->putJson("/api/v1/admin/orders/{$order->id}/shipment", ['carrier' => 'GHN'])->assertForbidden();
        }
    }

    private function checkoutPayload(string $method): array
    {
        return ['customer_name' => 'Phase Two', 'customer_email' => 'phase2@example.com', 'customer_phone' => '0900000000', 'province' => 'Hà Nội', 'district' => 'Ba Đình', 'ward' => 'Điện Biên', 'shipping_address' => '10 Trần Phú', 'payment_method' => $method];
    }

    private function guestPayload(int $variantId, string $method = 'cod'): array
    {
        return $this->checkoutPayload($method) + ['items' => [['product_variant_id' => $variantId, 'quantity' => 1]]];
    }
}
