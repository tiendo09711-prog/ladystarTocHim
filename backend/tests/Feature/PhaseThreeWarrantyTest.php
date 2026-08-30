<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\AfterSalesShipmentService;
use App\Services\GuestScopeTokenService;
use App\Services\WarrantyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PhaseThreeWarrantyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_checkout_snapshots_warranty_and_later_product_changes_do_not_change_it(): void
    {
        $user = User::where('role', 'user')->firstOrFail();
        $variant = ProductVariant::with('product')->firstOrFail();
        $variant->product->update(['warranty_days' => 120]);
        $this->actingAs($user)->postJson('/api/v1/cart/items', ['product_variant_id' => $variant->id, 'quantity' => 1])->assertCreated();
        $response = $this->actingAs($user)->postJson('/api/v1/checkout/place-order', $this->checkoutPayload())->assertCreated();
        $itemId = $response->json('data.items.0.id');
        $this->assertDatabaseHas('order_items', ['id' => $itemId, 'warranty_days_snapshot' => 120]);
        $variant->product->update(['warranty_days' => 10]);
        $this->assertDatabaseHas('order_items', ['id' => $itemId, 'warranty_days_snapshot' => 120]);
    }

    public function test_legacy_fallback_expiry_no_policy_completed_and_duplicate_rules(): void
    {
        $service = app(WarrantyService::class);
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $item->update(['warranty_days_snapshot' => null]);
        $item->product->update(['warranty_days' => 30]);
        $claim = $service->create($order, $item, $this->payload(), $order->user_id);
        $this->expectValidation(fn () => $service->create($order, $item, $this->payload(), $order->user_id));
        $service->reject($claim, 'Rejected');

        $order->update(['completed_at' => now()->subDays(40)]);
        $this->expectValidation(fn () => $service->create($order, $item, $this->payload(), $order->user_id));
        $order->update(['completed_at' => now(), 'order_status' => 'processing']);
        $this->expectValidation(fn () => $service->create($order, $item, $this->payload(), $order->user_id));
        $order->update(['order_status' => 'completed']);
        $item->product->update(['warranty_days' => null]);
        $this->expectValidation(fn () => $service->create($order, $item, $this->payload(), $order->user_id));
    }

    public function test_repair_flow_does_not_change_inventory_and_customer_ownership_hides_admin_note(): void
    {
        $service = app(WarrantyService::class);
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $item->update(['warranty_days_snapshot' => 30]);
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $item->product_variant_id)->firstOrFail();
        $before = $inventory->quantity_on_hand;
        $claim = $service->create($order, $item, $this->payload(), $order->user_id);
        $service->review($claim);
        $service->approve($claim, 'repair', null, $order->branch_id, 'internal');
        $service->receive($claim);
        $service->startProcessing($claim);
        $service->markReady($claim);
        $service->complete($claim);
        $this->assertSame($before, $inventory->refresh()->quantity_on_hand);
        $owner = User::findOrFail($order->user_id);
        $other = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $this->actingAs($other)->getJson('/api/v1/account/warranties/'.$claim->id)->assertNotFound();
        $this->actingAs($owner)->getJson('/api/v1/account/warranties/'.$claim->id)->assertOk()->assertJsonMissingPath('data.admin_note');
    }

    public function test_replacement_reserves_releases_and_ships_once(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $service = app(WarrantyService::class);
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $item->update(['warranty_days_snapshot' => 30]);
        $replacement = ProductVariant::whereKeyNot($item->product_variant_id)->where('status', 'active')->firstOrFail();
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $replacement->id)->firstOrFail();
        $beforeOnHand = $inventory->quantity_on_hand;
        $beforeReserved = $inventory->quantity_reserved;
        $claim = $service->create($order, $item, $this->payload('replacement'), $order->user_id);
        $service->review($claim);
        $service->approve($claim, 'replacement', $replacement->id, $order->branch_id);
        $this->assertSame($beforeReserved + 1, $inventory->refresh()->quantity_reserved);
        $service->cancel($claim);
        $this->assertSame($beforeReserved, $inventory->refresh()->quantity_reserved);

        $claim2 = $service->create($order, $item, $this->payload('replacement'), $order->user_id);
        $service->review($claim2);
        $service->approve($claim2, 'replacement', $replacement->id, $order->branch_id);
        $service->receive($claim2);
        $service->startProcessing($claim2);
        $service->markReady($claim2);
        $shipment = app(AfterSalesShipmentService::class)->save($claim2, 'warranty_outbound', ['carrier' => 'manual'], $admin->id);
        $service->updateShipmentStatus($shipment, 'shipped', $admin->id);
        $service->updateShipmentStatus($shipment->refresh(), 'shipped', $admin->id);
        $this->assertSame($beforeOnHand - 1, $inventory->refresh()->quantity_on_hand);
        $this->assertSame($beforeReserved, $inventory->quantity_reserved);
        $service->updateShipmentStatus($shipment->refresh(), 'delivered', $admin->id);
        $this->assertDatabaseHas('warranty_requests', ['id' => $claim2->id, 'status' => 'completed']);
    }

    public function test_replacement_insufficient_stock_and_guest_scope_are_enforced(): void
    {
        $service = app(WarrantyService::class);
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $item->update(['warranty_days_snapshot' => 30]);
        $replacement = ProductVariant::whereKeyNot($item->product_variant_id)->where('status', 'active')->firstOrFail();
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $replacement->id)->firstOrFail();
        $inventory->update(['quantity_reserved' => $inventory->quantity_on_hand]);
        $claim = $service->create($order, $item, $this->payload('replacement'), $order->user_id);
        $service->review($claim);
        $this->expectValidation(fn () => $service->approve($claim, 'replacement', $replacement->id, $order->branch_id));

        $guestA = $this->guestOrder('GW-A', '0902000001');
        $guestB = $this->guestOrder('GW-B', '0902000002');
        $token = app(GuestScopeTokenService::class)->issue('guest_order_after_sales', $guestA->id, $guestA->customer_phone);
        $payload = ['order_id' => $guestB->id, 'order_item_id' => $guestB->items->first()->id] + $this->payload();
        $this->withHeader('X-Guest-Token', $token)->postJson('/api/v1/guest/warranties', $payload)->assertUnprocessable();
        $payload = ['order_id' => $guestA->id, 'order_item_id' => $guestA->items->first()->id] + $this->payload();
        $this->withHeader('X-Guest-Token', $token)->postJson('/api/v1/guest/warranties', $payload)->assertCreated();
    }

    public function test_replacement_failed_returned_and_retry_reconcile_inventory_once(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $service = app(WarrantyService::class);
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $item->update(['warranty_days_snapshot' => 30]);
        $replacement = ProductVariant::whereKeyNot($item->product_variant_id)->where('status', 'active')->firstOrFail();
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $replacement->id)->firstOrFail();
        $before = $inventory->quantity_on_hand;
        $claim = $service->create($order, $item, $this->payload('replacement'), $order->user_id);
        $service->review($claim);
        $service->approve($claim, 'replacement', $replacement->id, $order->branch_id);
        $service->receive($claim);
        $service->startProcessing($claim);
        $service->markReady($claim);
        $shipment = app(AfterSalesShipmentService::class)->save($claim, 'warranty_outbound', ['carrier' => 'manual'], $admin->id);

        $service->updateShipmentStatus($shipment, 'shipped', $admin->id);
        $service->updateShipmentStatus($shipment->refresh(), 'delivery_failed', $admin->id, 'Recipient unavailable');
        $service->updateShipmentStatus($shipment->refresh(), 'shipped', $admin->id);
        $this->assertSame($before - 1, $inventory->refresh()->quantity_on_hand);
        $this->assertDatabaseMissing('warranty_requests', ['id' => $claim->id, 'status' => 'completed']);

        $service->updateShipmentStatus($shipment->refresh(), 'delivery_failed', $admin->id);
        $service->updateShipmentStatus($shipment->refresh(), 'returned', $admin->id, 'Returned to branch');
        $service->updateShipmentStatus($shipment->refresh(), 'returned', $admin->id);
        $this->assertSame($before, $inventory->refresh()->quantity_on_hand);
        $this->assertSame(0, $inventory->quantity_reserved);
        $this->assertDatabaseMissing('warranty_requests', ['id' => $claim->id, 'status' => 'completed']);

        $service->updateShipmentStatus($shipment->refresh(), 'shipped', $admin->id);
        $this->assertSame($before - 1, $inventory->refresh()->quantity_on_hand);
        $service->updateShipmentStatus($shipment->refresh(), 'delivered', $admin->id);
        $this->assertDatabaseHas('warranty_requests', ['id' => $claim->id, 'status' => 'completed']);
    }

    private function order(): Order
    {
        return Order::where('order_number', 'NH-DEMO-001')->with('items.product')->firstOrFail();
    }

    private function payload(string $resolution = 'repair'): array
    {
        return ['issue_type' => 'technical', 'description' => 'Warranty issue details', 'requested_resolution' => $resolution];
    }

    private function guestOrder(string $number, string $phone): Order
    {
        $source = $this->order();
        $item = $source->items->first();
        $order = Order::create($source->only(['branch_id', 'customer_name', 'customer_email', 'province', 'district', 'ward', 'shipping_address', 'subtotal', 'discount_amount', 'shipping_fee', 'total_amount', 'payment_method', 'payment_status']) + ['order_number' => $number, 'user_id' => null, 'customer_phone' => $phone, 'order_status' => 'completed', 'completed_at' => now()]);
        $order->items()->create($item->only(['product_id', 'product_variant_id', 'product_name', 'variant_description', 'variant_snapshot', 'sku', 'barcode', 'unit_price', 'quantity', 'line_total']) + ['warranty_days_snapshot' => 30]);

        return $order->load('items');
    }

    private function checkoutPayload(): array
    {
        return ['customer_name' => 'Warranty User', 'customer_email' => 'warranty@example.com', 'customer_phone' => '0903000000', 'province' => 'HCM', 'district' => 'District 1', 'ward' => 'Ward 1', 'shipping_address' => '1 Test Street', 'payment_method' => 'cod'];
    }

    private function expectValidation(callable $callback): void
    {
        try {
            $callback();
            $this->fail('Expected validation exception.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }
    }
}
