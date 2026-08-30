<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\AfterSalesEligibilityService;
use App\Services\ReturnRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseThreeReturnTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_eligibility_uses_delivery_then_completed_fallback_and_requires_completed_order(): void
    {
        $user = User::where('role', 'user')->firstOrFail();
        $order = $this->order();
        $item = $order->items()->firstOrFail();

        $order->update(['order_status' => 'processing']);
        $this->actingAs($user)->postJson('/api/v1/account/returns', $this->payload($order, $item))->assertUnprocessable();

        $order->update(['order_status' => 'completed', 'completed_at' => now()->subDays(2)]);
        $this->actingAs($user)->postJson('/api/v1/account/returns', $this->payload($order, $item))->assertCreated();

        ReturnRequest::query()->delete();
        $order->shipment()->create(['carrier' => 'manual', 'status' => 'delivered', 'delivered_at' => now()->subDays(10)]);
        $this->actingAs($user)->postJson('/api/v1/account/returns', $this->payload($order, $item))->assertUnprocessable();

        StoreSetting::current()->update(['return_window_days' => 20]);
        $this->actingAs($user)->postJson('/api/v1/account/returns', $this->payload($order, $item))->assertCreated();
    }

    public function test_order_item_ownership_quantity_and_active_claim_rules_are_enforced(): void
    {
        $user = User::where('role', 'user')->firstOrFail();
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $other = Order::create($order->only(['user_id', 'branch_id', 'customer_name', 'customer_email', 'customer_phone', 'province', 'district', 'ward', 'shipping_address', 'subtotal', 'discount_amount', 'shipping_fee', 'total_amount', 'payment_method', 'payment_status']) + ['order_number' => 'OTHER-1', 'order_status' => 'completed', 'completed_at' => now()]);
        $otherItem = $other->items()->create($item->only(['product_id', 'product_variant_id', 'product_name', 'variant_description', 'sku', 'barcode', 'unit_price', 'quantity', 'line_total']));

        $this->actingAs($user)->postJson('/api/v1/account/returns', $this->payload($order, $otherItem))->assertUnprocessable();
        $tooMany = $this->payload($order, $item);
        $tooMany['items'][0]['quantity'] = 2;
        $this->actingAs($user)->postJson('/api/v1/account/returns', $tooMany)->assertUnprocessable();
        $created = $this->actingAs($user)->postJson('/api/v1/account/returns', $this->payload($order, $item))->assertCreated();
        $this->actingAs($user)->postJson('/api/v1/account/returns', $this->payload($order, $item))->assertUnprocessable();

        $return = ReturnRequest::findOrFail($created->json('data.id'));
        app(ReturnRequestService::class)->reject($return, 'Not eligible after review');
        $this->actingAs($user)->postJson('/api/v1/account/returns', $this->payload($order, $item))->assertCreated();
    }

    public function test_customer_cannot_access_another_return_and_admin_note_is_hidden(): void
    {
        $owner = User::where('role', 'user')->firstOrFail();
        $other = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $return = app(ReturnRequestService::class)->createRequest($this->order(), $this->payload($this->order(), $this->order()->items()->firstOrFail()), $owner->id);
        $return->update(['admin_note' => 'internal-only']);

        $this->actingAs($other)->getJson('/api/v1/account/returns/'.$return->id)->assertNotFound();
        $this->actingAs($owner)->getJson('/api/v1/account/returns/'.$return->id)->assertOk()->assertJsonMissingPath('data.admin_note');
    }

    public function test_receive_restock_is_idempotent_and_non_restockable_does_not_change_stock(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $service = app(ReturnRequestService::class);
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $item->product_variant_id)->firstOrFail();
        $before = $inventory->quantity_on_hand;

        $return = $service->createRequest($order, $this->payload($order, $item), $order->user_id);
        $service->startReview($return);
        $service->approve($return, $order->branch_id);
        $line = $return->items()->firstOrFail();
        $payload = [['id' => $line->id, 'condition_status' => 'unused', 'restockable' => true]];
        $service->receive($return, $payload, $admin->id);
        $service->receive($return->refresh(), $payload, $admin->id);
        $this->assertSame($before + 1, $inventory->refresh()->quantity_on_hand);
        $this->assertDatabaseCount('inventory_transactions', 1);
        $this->assertDatabaseHas('inventory_transactions', ['type' => 'return_restock', 'reference_type' => ReturnRequest::class, 'reference_id' => $return->id]);

        $secondOrder = $this->duplicateOrder('SECOND-RETURN');
        $secondItem = $secondOrder->items()->firstOrFail();
        $return2 = $service->createRequest($secondOrder, $this->payload($secondOrder, $secondItem), $secondOrder->user_id);
        $service->startReview($return2);
        $service->approve($return2, $secondOrder->branch_id);
        $line2 = $return2->items()->firstOrFail();
        $service->receive($return2, [['id' => $line2->id, 'condition_status' => 'used', 'restockable' => false]], $admin->id);
        $this->assertSame($before + 1, $inventory->refresh()->quantity_on_hand);
    }

    public function test_reject_does_not_modify_inventory_and_cancel_releases_quantity(): void
    {
        $service = app(ReturnRequestService::class);
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $item->product_variant_id)->firstOrFail();
        $before = $inventory->quantity_on_hand;
        $return = $service->createRequest($order, $this->payload($order, $item), $order->user_id);
        $service->reject($return, 'Rejected');
        $this->assertSame($before, $inventory->refresh()->quantity_on_hand);
        $this->assertSame(1, app(AfterSalesEligibilityService::class)->returnableQuantity($item));
        $return2 = $service->createRequest($order, $this->payload($order, $item), $order->user_id);
        $service->cancel($return2);
        $this->assertSame(1, app(AfterSalesEligibilityService::class)->returnableQuantity($item));
    }

    private function order(): Order
    {
        return Order::where('order_number', 'NH-DEMO-001')->with('items')->firstOrFail();
    }

    private function duplicateOrder(string $number): Order
    {
        $source = $this->order();
        $order = Order::create($source->only(['user_id', 'branch_id', 'customer_name', 'customer_email', 'customer_phone', 'province', 'district', 'ward', 'shipping_address', 'subtotal', 'discount_amount', 'shipping_fee', 'total_amount', 'payment_method', 'payment_status']) + ['order_number' => $number, 'order_status' => 'completed', 'completed_at' => now()]);
        $item = $source->items()->firstOrFail();
        $order->items()->create($item->only(['product_id', 'product_variant_id', 'product_name', 'variant_description', 'variant_snapshot', 'sku', 'barcode', 'unit_price', 'quantity', 'line_total']));

        return $order;
    }

    private function payload(Order $order, $item): array
    {
        return ['order_id' => $order->id, 'request_type' => 'return', 'customer_note' => 'Please inspect', 'items' => [['order_item_id' => $item->id, 'quantity' => 1, 'reason_code' => 'not_suitable']]];
    }
}
