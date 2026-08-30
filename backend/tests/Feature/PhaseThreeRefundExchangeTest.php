<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\AfterSalesShipmentService;
use App\Services\RefundCalculatorService;
use App\Services\RefundService;
use App\Services\ReturnRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PhaseThreeRefundExchangeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_refunds_require_paid_payment_and_pending_plus_completed_cannot_over_refund(): void
    {
        [$order, $payment, $return, $admin] = $this->refundableReturn();
        $payment->update(['status' => 'pending']);
        $this->expectValidation(fn () => app(RefundService::class)->create($payment, ['amount' => 100000, 'method' => 'manual'], $admin->id, $return));
        $payment->update(['status' => 'paid']);
        $first = app(RefundService::class)->create($payment, ['amount' => 500000, 'method' => 'manual'], $admin->id, $return);
        $this->expectValidation(fn () => app(RefundService::class)->create($payment, ['amount' => (float) $payment->amount, 'method' => 'manual'], $admin->id, $return));
        app(RefundService::class)->cancel($first, $admin->id);
        $this->assertSame((float) $payment->amount, app(RefundService::class)->remainingRefundableAmount($payment));
    }

    public function test_partial_and_full_refunds_update_payment_status_and_complete_is_idempotent(): void
    {
        [$order, $payment, $return, $admin] = $this->refundableReturn();
        $service = app(RefundService::class);
        $half = round((float) $payment->amount / 2, 2);
        $first = $service->create($payment, ['amount' => $half, 'method' => 'manual_bank_transfer'], $admin->id, $return);
        $service->complete($first, $admin->id, 'RF-ONE');
        $service->complete($first->refresh(), $admin->id);
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'partially_refunded']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'payment_status' => 'partially_refunded']);

        $remaining = $service->remainingRefundableAmount($payment->refresh());
        $second = $service->create($payment->refresh(), ['amount' => $remaining, 'method' => 'cash'], $admin->id, $return);
        $service->complete($second, $admin->id);
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'refunded']);
        $this->assertDatabaseCount('refunds', 2);
    }

    public function test_refund_calculator_allocates_discount_partial_quantity_and_shipping_policy(): void
    {
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $item->update(['quantity' => 2, 'unit_price' => 1000000, 'line_total' => 2000000]);
        $order->update(['subtotal' => 2000000, 'discount_amount' => 200000, 'shipping_fee' => 30000, 'total_amount' => 1830000]);
        $return = app(ReturnRequestService::class)->createRequest($order, ['request_type' => 'return', 'items' => [['order_item_id' => $item->id, 'quantity' => 1, 'reason_code' => 'test']]], $order->user_id);
        $this->assertSame(900000.0, app(RefundCalculatorService::class)->suggestedForReturn($return));
        StoreSetting::current()->update(['refund_shipping_on_full_return' => true]);
        $return->update(['status' => 'cancelled']);
        $full = app(ReturnRequestService::class)->createRequest($order, ['request_type' => 'return', 'items' => [['order_item_id' => $item->id, 'quantity' => 2, 'reason_code' => 'test']]], $order->user_id);
        $this->assertSame(1830000.0, app(RefundCalculatorService::class)->suggestedForReturn($full));
    }

    public function test_direct_refunded_toggle_is_retired_and_customer_does_not_see_internal_note(): void
    {
        [$order, $payment, $return, $admin] = $this->refundableReturn();
        $user = User::findOrFail($order->user_id);
        $this->actingAs($admin)->patchJson('/api/v1/admin/orders/'.$order->id.'/payment-status', ['payment_status' => 'refunded'])->assertUnprocessable();
        $refund = app(RefundService::class)->create($payment, ['amount' => 100000, 'method' => 'manual', 'admin_note' => 'secret'], $admin->id, $return);
        app(RefundService::class)->complete($refund, $admin->id);
        $this->actingAs($user)->getJson('/api/v1/account/returns/'.$return->id)->assertOk()->assertJsonMissingPath('data.refunds.0.admin_note');
    }

    public function test_exchange_validation_reserve_release_consume_and_delivery_are_idempotent(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $replacement = ProductVariant::where('product_id', $item->product_id)->whereKeyNot($item->product_variant_id)->firstOrFail();
        $replacement->update(['price' => $item->unit_price, 'sale_price' => null, 'status' => 'active']);
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $replacement->id)->firstOrFail();
        $beforeOnHand = $inventory->quantity_on_hand;
        $beforeReserved = $inventory->quantity_reserved;
        $service = app(ReturnRequestService::class);
        $return = $service->createRequest($order, $this->exchangePayload($item->id, $replacement->id), $order->user_id);
        $this->assertNull($return->items()->firstOrFail()->replacement_value);
        $service->startReview($return);
        $service->approve($return, $order->branch_id);
        $line = $return->items()->firstOrFail()->refresh();
        $this->assertSame((float) $item->unit_price, (float) $line->original_value);
        $this->assertSame((float) $item->unit_price, (float) $line->replacement_value);
        $this->assertSame(0.0, (float) $line->price_difference);
        $replacement->update(['price' => (float) $item->unit_price + 300000]);
        $this->assertSame($beforeReserved + 1, $inventory->refresh()->quantity_reserved);

        $service->receive($return, [['id' => $line->id, 'condition_status' => 'used', 'restockable' => false]], $admin->id);
        $shipment = app(AfterSalesShipmentService::class)->save($return, 'exchange_outbound', ['carrier' => 'manual'], $admin->id);
        $service->updateExchangeShipmentStatus($shipment, 'shipped', $admin->id);
        $service->updateExchangeShipmentStatus($shipment->refresh(), 'shipped', $admin->id);
        $this->assertSame($beforeOnHand - 1, $inventory->refresh()->quantity_on_hand);
        $this->assertSame($beforeReserved, $inventory->quantity_reserved);
        $service->updateExchangeShipmentStatus($shipment->refresh(), 'delivered', $admin->id);
        $this->assertDatabaseHas('return_requests', ['id' => $return->id, 'status' => 'completed']);
    }

    public function test_exchange_rejects_wrong_product_inactive_price_and_stock_and_cancel_releases_reservation(): void
    {
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $sameProduct = ProductVariant::where('product_id', $item->product_id)->whereKeyNot($item->product_variant_id)->firstOrFail();
        $otherProduct = ProductVariant::where('product_id', '!=', $item->product_id)->firstOrFail();
        $this->expectValidation(fn () => app(ReturnRequestService::class)->createRequest($order, $this->exchangePayload($item->id, $otherProduct->id), $order->user_id));
        $sameProduct->update(['status' => 'inactive']);
        $this->expectValidation(fn () => app(ReturnRequestService::class)->createRequest($order, $this->exchangePayload($item->id, $sameProduct->id), $order->user_id));
        $sameProduct->update(['status' => 'active', 'price' => (float) $item->unit_price + 1, 'sale_price' => null]);
        $priceMismatch = app(ReturnRequestService::class)->createRequest($order, $this->exchangePayload($item->id, $sameProduct->id), $order->user_id);
        app(ReturnRequestService::class)->startReview($priceMismatch);
        $this->expectValidation(fn () => app(ReturnRequestService::class)->approve($priceMismatch, $order->branch_id));
        $priceMismatch->update(['status' => 'cancelled']);

        $sameProduct->update(['price' => $item->unit_price]);
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $sameProduct->id)->firstOrFail();
        $inventory->update(['quantity_on_hand' => 1, 'quantity_reserved' => 1]);
        $return = app(ReturnRequestService::class)->createRequest($order, $this->exchangePayload($item->id, $sameProduct->id), $order->user_id);
        app(ReturnRequestService::class)->startReview($return);
        $this->expectValidation(fn () => app(ReturnRequestService::class)->approve($return, $order->branch_id));

        $inventory->update(['quantity_reserved' => 0]);
        app(ReturnRequestService::class)->approve($return->refresh(), $order->branch_id);
        app(ReturnRequestService::class)->cancel($return->refresh());
        $this->assertSame(0, $inventory->refresh()->quantity_reserved);
    }

    public function test_exchange_failed_returned_and_retry_reconcile_inventory_once(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $replacement = ProductVariant::where('product_id', $item->product_id)->whereKeyNot($item->product_variant_id)->firstOrFail();
        $replacement->update(['price' => $item->unit_price, 'sale_price' => null, 'status' => 'active']);
        $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $replacement->id)->firstOrFail();
        $before = $inventory->quantity_on_hand;
        $service = app(ReturnRequestService::class);
        $return = $service->createRequest($order, $this->exchangePayload($item->id, $replacement->id), $order->user_id);
        $service->startReview($return);
        $service->approve($return, $order->branch_id);
        $line = $return->items()->firstOrFail();
        $service->receive($return, [['id' => $line->id, 'condition_status' => 'used', 'restockable' => false]], $admin->id);
        $shipment = app(AfterSalesShipmentService::class)->save($return, 'exchange_outbound', ['carrier' => 'manual'], $admin->id);

        $service->updateExchangeShipmentStatus($shipment, 'shipped', $admin->id);
        $service->updateExchangeShipmentStatus($shipment->refresh(), 'delivery_failed', $admin->id, 'Recipient unavailable');
        $service->updateExchangeShipmentStatus($shipment->refresh(), 'shipped', $admin->id);
        $this->assertSame($before - 1, $inventory->refresh()->quantity_on_hand);
        $this->assertDatabaseHas('return_requests', ['id' => $return->id, 'status' => 'received']);

        $service->updateExchangeShipmentStatus($shipment->refresh(), 'delivery_failed', $admin->id);
        $service->updateExchangeShipmentStatus($shipment->refresh(), 'returned', $admin->id, 'Returned to branch');
        $service->updateExchangeShipmentStatus($shipment->refresh(), 'returned', $admin->id);
        $this->assertSame($before, $inventory->refresh()->quantity_on_hand);
        $this->assertSame(0, $inventory->quantity_reserved);
        $this->assertDatabaseHas('return_requests', ['id' => $return->id, 'status' => 'received']);

        $service->updateExchangeShipmentStatus($shipment->refresh(), 'shipped', $admin->id);
        $this->assertSame($before - 1, $inventory->refresh()->quantity_on_hand);
        $this->assertSame(0, $inventory->quantity_reserved);
        $service->updateExchangeShipmentStatus($shipment->refresh(), 'delivered', $admin->id);
        $this->assertDatabaseHas('return_requests', ['id' => $return->id, 'status' => 'completed']);
    }

    private function refundableReturn(): array
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $order = $this->order();
        $item = $order->items()->firstOrFail();
        $payment = Payment::updateOrCreate(['order_id' => $order->id], ['method' => 'manual', 'provider' => 'manual', 'amount' => $order->total_amount, 'status' => 'paid', 'paid_at' => now()]);
        $return = app(ReturnRequestService::class)->createRequest($order, ['request_type' => 'return', 'items' => [['order_item_id' => $item->id, 'quantity' => 1, 'reason_code' => 'test']]], $order->user_id);
        app(ReturnRequestService::class)->startReview($return);
        app(ReturnRequestService::class)->approve($return, $order->branch_id);
        $line = $return->items()->firstOrFail();
        app(ReturnRequestService::class)->receive($return, [['id' => $line->id, 'condition_status' => 'used', 'restockable' => false]], $admin->id);

        return [$order, $payment, $return->refresh(), $admin];
    }

    private function order(): Order
    {
        return Order::where('order_number', 'NH-DEMO-001')->with('items')->firstOrFail();
    }

    private function exchangePayload(int $itemId, int $variantId): array
    {
        return ['request_type' => 'exchange', 'items' => [['order_item_id' => $itemId, 'quantity' => 1, 'reason_code' => 'size', 'replacement_variant_id' => $variantId]]];
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
