<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Services\GuestScopeTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class GuestAfterSalesSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_guest_token_is_scoped_to_order_and_registered_orders_are_not_mutable(): void
    {
        $guestA = $this->guestOrder('GUEST-A', '0901000001');
        $guestB = $this->guestOrder('GUEST-B', '0901000002');
        $tokenA = app(GuestScopeTokenService::class)->issue('guest_order_after_sales', $guestA->id, $guestA->customer_phone);

        $this->withHeader('X-Guest-Token', $tokenA)->postJson('/api/v1/guest/returns', $this->payload($guestB))->assertUnprocessable();
        $created = $this->withHeader('X-Guest-Token', $tokenA)->postJson('/api/v1/guest/returns', $this->payload($guestA))->assertCreated();
        $this->withHeader('X-Guest-Token', $tokenA)->getJson('/api/v1/guest/returns/'.$created->json('data.code'))->assertOk()->assertJsonMissingPath('data.admin_note');

        $registered = Order::where('order_number', 'NH-DEMO-001')->firstOrFail();
        $registeredToken = app(GuestScopeTokenService::class)->issue('guest_order_after_sales', $registered->id, $registered->customer_phone);
        $this->withHeader('X-Guest-Token', $registeredToken)->postJson('/api/v1/guest/returns', $this->payload($registered))->assertNotFound();
    }

    public function test_expired_guest_token_is_rejected_and_tracking_only_issues_token_for_guest_order(): void
    {
        Carbon::setTestNow('2026-08-28 10:00:00');
        $guest = $this->guestOrder('GUEST-C', '0901000003');
        $token = app(GuestScopeTokenService::class)->issue('guest_order_after_sales', $guest->id, $guest->customer_phone, 1);
        Carbon::setTestNow('2026-08-28 10:02:00');
        $this->withHeader('X-Guest-Token', $token)->postJson('/api/v1/guest/returns', $this->payload($guest))->assertUnprocessable();

        Carbon::setTestNow();
        $this->postJson('/api/v1/orders/track', ['order_number' => $guest->order_number, 'phone' => $guest->customer_phone])->assertOk()->assertJsonPath('data.order_number', $guest->order_number)->assertJsonStructure(['data' => ['guest_after_sales_token']]);
        $registered = Order::where('order_number', 'NH-DEMO-001')->firstOrFail();
        $this->postJson('/api/v1/orders/track', ['order_number' => $registered->order_number, 'phone' => $registered->customer_phone])->assertNotFound()->assertJsonPath('message', 'Không tìm thấy đơn hàng phù hợp.');
    }

    private function guestOrder(string $number, string $phone): Order
    {
        $source = Order::where('order_number', 'NH-DEMO-001')->with('items')->firstOrFail();
        $order = Order::create($source->only(['branch_id', 'customer_name', 'customer_email', 'province', 'district', 'ward', 'shipping_address', 'subtotal', 'discount_amount', 'shipping_fee', 'total_amount', 'payment_method', 'payment_status']) + ['order_number' => $number, 'user_id' => null, 'customer_phone' => $phone, 'order_status' => 'completed', 'completed_at' => now()]);
        $item = $source->items->first();
        $order->items()->create($item->only(['product_id', 'product_variant_id', 'product_name', 'variant_description', 'variant_snapshot', 'sku', 'barcode', 'unit_price', 'quantity', 'line_total']));

        return $order->load('items');
    }

    private function payload(Order $order): array
    {
        return ['order_id' => $order->id, 'request_type' => 'return', 'items' => [['order_item_id' => $order->items->first()->id, 'quantity' => 1, 'reason_code' => 'not_suitable']]];
    }
}
