<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\AfterSalesShipmentService;
use App\Services\ReturnRequestService;
use App\Services\WarrantyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AfterSalesFulfillmentGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_warranty_outbound_dispatch_requires_ready_status(): void
    {
        $admin = $this->admin();
        $service = app(WarrantyService::class);
        $order = $this->order();
        $item = $order->items->firstOrFail();
        $item->update(['warranty_days_snapshot' => 30]);
        $claim = $service->create($order, $item, $this->warrantyPayload('repair'), $order->user_id);
        $shipment = app(AfterSalesShipmentService::class)->save($claim, 'warranty_outbound', ['carrier' => 'Manual'], $admin->id);

        $this->expectValidation(fn () => $service->updateShipmentStatus($shipment->refresh(), 'shipped', $admin->id));
        $claim = $service->review($claim);
        $this->expectValidation(fn () => $service->updateShipmentStatus($shipment->refresh(), 'shipped', $admin->id));
        $claim = $service->approve($claim, 'repair', null, $order->branch_id);
        $this->expectValidation(fn () => $service->updateShipmentStatus($shipment->refresh(), 'shipped', $admin->id));
        $claim = $service->receive($claim);
        $claim = $service->startProcessing($claim);
        $claim = $service->markReady($claim);

        $service->updateShipmentStatus($shipment->refresh(), 'shipped', $admin->id);
        $this->assertDatabaseHas('after_sales_shipments', ['id' => $shipment->id, 'status' => 'shipped']);
        $this->assertSame('ready', $claim->refresh()->status);
    }

    public function test_warranty_replacement_only_completes_by_delivery(): void
    {
        [$claim, $replacement, $inventory, $admin] = $this->readyWarranty('replacement');
        $before = $inventory->quantity_on_hand;
        $shipment = app(AfterSalesShipmentService::class)->save($claim, 'warranty_outbound', ['carrier' => 'Manual'], $admin->id);
        app(WarrantyService::class)->updateShipmentStatus($shipment, 'shipped', $admin->id);

        $this->expectValidation(
            fn () => app(WarrantyService::class)->complete($claim->refresh()),
            'status',
            'Replacement warranty must be completed by delivery or handover.',
        );
        $this->assertSame($before - 1, $inventory->refresh()->quantity_on_hand);
        $this->assertSame(0, $inventory->quantity_reserved);

        app(WarrantyService::class)->updateShipmentStatus($shipment->refresh(), 'delivered', $admin->id);
        $this->assertDatabaseHas('warranty_requests', ['id' => $claim->id, 'status' => 'completed']);
        $this->expectValidation(
            fn () => app(AfterSalesShipmentService::class)->save($claim->refresh(), 'warranty_outbound', ['carrier' => 'Blocked'], $admin->id),
            'shipment',
            'Shipment metadata cannot be edited after dispatch.',
        );
        $this->assertNotNull($claim->refresh()->replacement_consumed_at);
        $this->assertNull($claim->replacement_restocked_at);
        $this->assertSame($replacement->id, $claim->replacement_variant_id);

    }

    public function test_repair_warranty_generic_complete_still_works(): void
    {
        [$claim] = $this->readyWarranty('repair');
        app(WarrantyService::class)->complete($claim);
        $this->assertDatabaseHas('warranty_requests', ['id' => $claim->id, 'status' => 'completed']);
    }

    public function test_warranty_handover_rejects_active_outbound_and_reconciles_returned_stock_once(): void
    {
        [$claim, , $inventory, $admin] = $this->readyWarranty('replacement');
        $before = $inventory->quantity_on_hand;
        $shipment = app(AfterSalesShipmentService::class)->save($claim, 'warranty_outbound', ['carrier' => 'Manual'], $admin->id);
        $service = app(WarrantyService::class);

        $this->expectValidation(fn () => $service->handoverReplacement($claim, $admin->id), 'shipment', 'Cannot hand over replacement while an outbound shipment is active.');
        $service->updateShipmentStatus($shipment, 'shipped', $admin->id);
        $this->expectValidation(fn () => $service->handoverReplacement($claim->refresh(), $admin->id), 'shipment', 'Cannot hand over replacement while an outbound shipment is active.');
        $service->updateShipmentStatus($shipment->refresh(), 'delivery_failed', $admin->id, 'Unavailable');
        $this->expectValidation(fn () => $service->handoverReplacement($claim->refresh(), $admin->id), 'shipment', 'Cannot hand over replacement while an outbound shipment is active.');
        $service->updateShipmentStatus($shipment->refresh(), 'returned', $admin->id, 'Returned');
        $this->assertSame($before, $inventory->refresh()->quantity_on_hand);

        $this->actingAs($admin)->postJson('/api/v1/admin/warranties/'.$claim->id.'/handover')->assertOk();
        $this->assertSame($before - 1, $inventory->refresh()->quantity_on_hand);
        $this->assertSame(0, $inventory->quantity_reserved);
        $this->assertDatabaseHas('warranty_requests', ['id' => $claim->id, 'status' => 'completed']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'warranty.replacement_handover']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'warranty.completed']);
        $this->expectValidation(fn () => app(AfterSalesShipmentService::class)->save($claim->refresh(), 'warranty_outbound', ['carrier' => 'Blocked'], $admin->id), 'shipment');

        $this->actingAs($admin)->postJson('/api/v1/admin/warranties/'.$claim->id.'/handover')->assertOk();
        $this->assertSame($before - 1, $inventory->refresh()->quantity_on_hand);
    }

    public function test_exchange_handover_rejects_active_outbound_and_reconciles_returned_stock_once(): void
    {
        [$return, , $inventory, $admin] = $this->receivedExchange();
        $before = $inventory->quantity_on_hand;
        $shipment = app(AfterSalesShipmentService::class)->save($return, 'exchange_outbound', ['carrier' => 'Manual'], $admin->id);
        $service = app(ReturnRequestService::class);

        $this->expectValidation(fn () => $service->handoverExchange($return, $admin->id), 'shipment', 'Cannot hand over replacement while an outbound shipment is active.');
        $service->updateExchangeShipmentStatus($shipment, 'shipped', $admin->id);
        $this->expectValidation(fn () => $service->handoverExchange($return->refresh(), $admin->id), 'shipment', 'Cannot hand over replacement while an outbound shipment is active.');
        $service->updateExchangeShipmentStatus($shipment->refresh(), 'delivery_failed', $admin->id, 'Unavailable');
        $this->expectValidation(fn () => $service->handoverExchange($return->refresh(), $admin->id), 'shipment', 'Cannot hand over replacement while an outbound shipment is active.');
        $service->updateExchangeShipmentStatus($shipment->refresh(), 'returned', $admin->id, 'Returned');
        $this->assertSame($before, $inventory->refresh()->quantity_on_hand);

        $this->actingAs($admin)->postJson('/api/v1/admin/returns/'.$return->id.'/handover')->assertOk();
        $this->assertSame($before - 1, $inventory->refresh()->quantity_on_hand);
        $this->assertSame(0, $inventory->quantity_reserved);
        $this->assertDatabaseHas('return_requests', ['id' => $return->id, 'status' => 'completed']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'exchange.replacement_handover']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'exchange.completed']);
        $this->expectValidation(fn () => app(AfterSalesShipmentService::class)->save($return->refresh(), 'exchange_outbound', ['carrier' => 'Blocked'], $admin->id), 'shipment');

        $this->actingAs($admin)->postJson('/api/v1/admin/returns/'.$return->id.'/handover')->assertOk();
        $this->assertSame($before - 1, $inventory->refresh()->quantity_on_hand);
    }

    public function test_delivered_guards_require_consumed_replacement_inventory(): void
    {
        [$claim, , , $admin] = $this->readyWarranty('replacement');
        $warrantyShipment = app(AfterSalesShipmentService::class)->save($claim, 'warranty_outbound', ['carrier' => 'Manual'], $admin->id);
        $warrantyShipment->update(['status' => 'shipped', 'shipped_at' => now()]);
        $this->expectValidation(fn () => app(WarrantyService::class)->updateShipmentStatus($warrantyShipment->refresh(), 'delivered', $admin->id), 'stock');
        $this->assertSame('ready', $claim->refresh()->status);
        $this->assertSame('shipped', $warrantyShipment->refresh()->status);

        [$return] = $this->receivedExchange();
        $exchangeShipment = app(AfterSalesShipmentService::class)->save($return, 'exchange_outbound', ['carrier' => 'Manual'], $admin->id);
        $exchangeShipment->update(['status' => 'shipped', 'shipped_at' => now()]);
        $this->expectValidation(fn () => app(ReturnRequestService::class)->updateExchangeShipmentStatus($exchangeShipment->refresh(), 'delivered', $admin->id), 'stock');
        $this->assertSame('received', $return->refresh()->status);
        $this->assertSame('shipped', $exchangeShipment->refresh()->status);
    }

    public function test_shipment_metadata_lock_allows_pending_and_failed_retry_edits_only(): void
    {
        [$claim, , , $admin] = $this->readyWarranty('repair');
        $shipments = app(AfterSalesShipmentService::class);
        $shipment = $shipments->save($claim, 'warranty_outbound', ['carrier' => 'First'], $admin->id);

        $shipments->save($claim, 'warranty_outbound', ['carrier' => 'Pending Edit'], $admin->id);
        $this->assertSame('Pending Edit', $shipment->refresh()->carrier);

        $shipment->update(['status' => 'shipped']);
        $this->expectValidation(fn () => $shipments->save($claim, 'warranty_outbound', ['carrier' => 'Blocked'], $admin->id), 'shipment', 'Shipment metadata cannot be edited after dispatch.');
        $shipment->update(['status' => 'delivery_failed']);
        $shipments->save($claim, 'warranty_outbound', ['carrier' => 'Retry Carrier'], $admin->id);
        $this->assertSame('Retry Carrier', $shipment->refresh()->carrier);
        $shipment->update(['status' => 'returned']);
        $this->expectValidation(fn () => $shipments->save($claim, 'warranty_outbound', ['carrier' => 'Blocked'], $admin->id), 'shipment', 'Shipment metadata cannot be edited after dispatch.');
        $shipment->update(['status' => 'delivered']);
        $this->expectValidation(fn () => $shipments->save($claim, 'warranty_outbound', ['carrier' => 'Blocked'], $admin->id), 'shipment', 'Shipment metadata cannot be edited after dispatch.');
    }

    public function test_customer_and_admin_resources_expose_failure_and_return_fields(): void
    {
        [$claim, , , $admin] = $this->readyWarranty('repair');
        $warrantyShipment = app(AfterSalesShipmentService::class)->save($claim, 'warranty_outbound', ['carrier' => 'Manual', 'tracking_number' => 'WR-TRACK', 'tracking_url' => 'https://example.test/warranty'], $admin->id);
        $warrantyShipment->update([
            'status' => 'returned', 'shipped_at' => now()->subHours(3), 'failed_at' => now()->subHours(2),
            'failure_reason' => 'Unavailable', 'returned_at' => now(), 'return_reason' => 'Returned to branch',
        ]);
        $owner = User::findOrFail($claim->user_id);
        $shipmentFields = ['status', 'failed_at', 'failure_reason', 'returned_at', 'return_reason', 'shipped_at', 'delivered_at', 'carrier', 'tracking_number', 'tracking_url'];
        $this->actingAs($owner)->getJson('/api/v1/account/warranties/'.$claim->id)->assertOk()
            ->assertJsonStructure(['data' => ['shipments' => [$shipmentFields]]])
            ->assertJsonPath('data.shipments.0.failure_reason', 'Unavailable')
            ->assertJsonPath('data.shipments.0.return_reason', 'Returned to branch');
        $this->actingAs($admin)->getJson('/api/v1/admin/warranties/'.$claim->id)->assertOk()
            ->assertJsonStructure(['data' => ['shipments' => [$shipmentFields]]]);

        [$return] = $this->receivedExchange();
        $returnShipment = app(AfterSalesShipmentService::class)->save($return, 'exchange_outbound', ['carrier' => 'Manual', 'tracking_number' => 'RT-TRACK', 'tracking_url' => 'https://example.test/exchange'], $admin->id);
        $returnShipment->update([
            'status' => 'returned', 'shipped_at' => now()->subHours(3), 'failed_at' => now()->subHours(2),
            'failure_reason' => 'Unavailable', 'returned_at' => now(), 'return_reason' => 'Returned to branch',
        ]);
        $this->actingAs(User::findOrFail($return->user_id))->getJson('/api/v1/account/returns/'.$return->id)->assertOk()
            ->assertJsonStructure(['data' => ['shipments' => [$shipmentFields]]]);
        $this->actingAs($admin)->getJson('/api/v1/admin/returns/'.$return->id)->assertOk()
            ->assertJsonStructure(['data' => ['shipments' => [$shipmentFields]]]);
    }

    public function test_cross_reference_routes_reject_foreign_warranty_and_exchange_shipments(): void
    {
        [$claim, , , $admin] = $this->readyWarranty('repair');
        $warrantyShipment = app(AfterSalesShipmentService::class)->save($claim, 'warranty_outbound', ['carrier' => 'Manual'], $admin->id);
        $foreignClaim = $claim->replicate();
        $foreignClaim->code = 'WR-FOREIGN';
        $foreignClaim->save();
        $this->actingAs($admin)->patchJson('/api/v1/admin/warranties/'.$foreignClaim->id.'/shipments/'.$warrantyShipment->id.'/status', ['status' => 'shipped'])->assertNotFound();

        [$return] = $this->receivedExchange();
        $exchangeShipment = app(AfterSalesShipmentService::class)->save($return, 'exchange_outbound', ['carrier' => 'Manual'], $admin->id);
        $foreignReturn = $return->replicate();
        $foreignReturn->code = 'RT-FOREIGN';
        $foreignReturn->save();
        $this->actingAs($admin)->patchJson('/api/v1/admin/returns/'.$foreignReturn->id.'/shipments/'.$exchangeShipment->id.'/status', ['status' => 'shipped'])->assertNotFound();
    }

    public function test_after_sales_shipment_permissions_and_audit_actions_are_enforced(): void
    {
        [$claim, , , $admin] = $this->readyWarranty('repair');
        $staff = User::factory()->staff()->create();
        $url = '/api/v1/admin/warranties/'.$claim->id.'/shipment';
        $payload = ['purpose' => 'warranty_outbound', 'carrier' => 'Manual', 'tracking_number' => 'TRACK-1'];
        $this->actingAs($staff)->putJson($url, $payload)->assertForbidden();

        $response = $this->actingAs($admin)->putJson($url, $payload)->assertOk();
        $shipmentId = $response->json('data.id');
        $this->assertDatabaseHas('audit_logs', ['action' => 'after_sales_shipment.created']);
        $this->actingAs($admin)->putJson($url, $payload + ['note' => 'Pending update'])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'after_sales_shipment.updated']);

        $statusUrl = '/api/v1/admin/warranties/'.$claim->id.'/shipments/'.$shipmentId.'/status';
        $this->actingAs($staff)->patchJson($statusUrl, ['status' => 'shipped'])->assertForbidden();
        $this->actingAs($admin)->patchJson($statusUrl, ['status' => 'shipped'])->assertOk();
        $this->actingAs($admin)->patchJson($statusUrl, ['status' => 'delivery_failed', 'failure_reason' => 'Unavailable'])->assertOk();
        $this->actingAs($admin)->putJson($url, $payload + ['tracking_number' => 'TRACK-RETRY'])->assertOk();
        $this->actingAs($admin)->patchJson($statusUrl, ['status' => 'shipped'])->assertOk();
        $this->actingAs($admin)->patchJson($statusUrl, ['status' => 'delivery_failed'])->assertOk();
        $this->actingAs($admin)->patchJson($statusUrl, ['status' => 'returned', 'return_reason' => 'Returned'])->assertOk();
        $this->actingAs($admin)->patchJson($statusUrl, ['status' => 'shipped'])->assertOk();
        $this->actingAs($admin)->patchJson($statusUrl, ['status' => 'delivered'])->assertOk();

        foreach (['after_sales_shipment.shipped', 'after_sales_shipment.delivery_failed', 'after_sales_shipment.retried', 'after_sales_shipment.returned', 'after_sales_shipment.delivered'] as $action) {
            $this->assertDatabaseHas('audit_logs', ['action' => $action]);
        }
        $this->assertDatabaseHas('audit_logs', ['action' => 'warranty.completed']);
    }

    private function readyWarranty(string $resolution): array
    {
        $admin = $this->admin();
        $service = app(WarrantyService::class);
        $order = $this->order();
        $item = $order->items->firstOrFail();
        $item->update(['warranty_days_snapshot' => 30]);
        $replacement = null;
        $inventory = null;
        $claim = $service->create($order, $item, $this->warrantyPayload($resolution), $order->user_id);
        $claim = $service->review($claim);
        if ($resolution === 'replacement') {
            $replacement = ProductVariant::where('product_id', $item->product_id)->whereKeyNot($item->product_variant_id)->where('status', 'active')->firstOrFail();
            $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $replacement->id)->firstOrFail();
            $claim = $service->approve($claim, 'replacement', $replacement->id, $order->branch_id);
        } else {
            $claim = $service->approve($claim, 'repair', null, $order->branch_id);
        }
        $claim = $service->receive($claim);
        $claim = $service->startProcessing($claim);
        $claim = $service->markReady($claim);

        return [$claim, $replacement, $inventory, $admin];
    }

    private function receivedExchange(): array
    {
        $admin = $this->admin();
        $order = $this->order();
        $item = $order->items->firstOrFail();
        $replacement = ProductVariant::where('product_id', $item->product_id)->whereKeyNot($item->product_variant_id)->firstOrFail();
        $replacement->update(['price' => $item->unit_price, 'sale_price' => null, 'status' => 'active']);
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $replacement->id)->firstOrFail();
        $service = app(ReturnRequestService::class);
        $return = $service->createRequest($order, [
            'request_type' => 'exchange',
            'items' => [[
                'order_item_id' => $item->id,
                'quantity' => 1,
                'reason_code' => 'size',
                'replacement_variant_id' => $replacement->id,
            ]],
        ], $order->user_id);
        $return = $service->startReview($return);
        $return = $service->approve($return, $order->branch_id);
        $line = $return->items()->firstOrFail();
        $return = $service->receive($return, [['id' => $line->id, 'condition_status' => 'used', 'restockable' => false]], $admin->id);

        return [$return, $replacement, $inventory, $admin];
    }

    private function order(): Order
    {
        return Order::where('order_number', 'NH-DEMO-001')->with('items.product')->firstOrFail();
    }

    private function admin(): User
    {
        return User::where('role', 'admin')->firstOrFail();
    }

    private function warrantyPayload(string $resolution): array
    {
        return ['issue_type' => 'technical', 'description' => 'Warranty issue details', 'requested_resolution' => $resolution];
    }

    private function expectValidation(callable $callback, ?string $key = null, ?string $message = null): ValidationException
    {
        try {
            $callback();
            $this->fail('Expected validation exception.');
        } catch (ValidationException $exception) {
            if ($key !== null) {
                $this->assertArrayHasKey($key, $exception->errors());
            }
            if ($key !== null && $message !== null) {
                $this->assertSame($message, $exception->errors()[$key][0]);
            }

            return $exception;
        }
    }
}
