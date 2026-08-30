<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\AfterSalesMedium;
use App\Models\AppointmentSchedule;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\Refund;
use App\Models\Service;
use App\Models\Shipment;
use App\Models\User;
use App\Services\AppointmentService;
use App\Services\GuestScopeTokenService;
use App\Services\OrderLifecycleService;
use App\Services\PaymentService;
use App\Services\RefundCalculatorService;
use App\Services\RefundService;
use App\Services\ReturnRequestService;
use App\Services\ShipmentService;
use App\Services\WarrantyService;
use App\Support\PhoneNormalizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PhaseFiveOneBusinessHardeningTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $customer;

    private ProductVariant $variant;

    private Inventory $inventory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::where('role', 'admin')->firstOrFail();
        $this->customer = User::where('role', 'user')->firstOrFail();
        $this->variant = ProductVariant::with('product')->firstOrFail();
        $this->inventory = Inventory::where('product_variant_id', $this->variant->id)->firstOrFail();
        $this->inventory->update(['quantity_on_hand' => 100, 'quantity_reserved' => 0]);
    }

    public function test_paid_expired_order_is_not_cancelled_and_mark_paid_clears_expiry(): void
    {
        $paid = $this->pendingOrder('bank_transfer', 1);
        app(PaymentService::class)->updateStatus($paid, 'paid', $this->admin->id, 'BANK-PAID');
        $paid->update(['expires_at' => now()->subMinute()]);

        $unpaid = $this->pendingOrder('bank_transfer', 1);
        $unpaid->update(['expires_at' => now()->subMinute()]);
        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertSame('pending', $paid->refresh()->order_status);
        $this->assertSame('cancelled', $unpaid->refresh()->order_status);

        $fresh = $this->pendingOrder('bank_transfer', 1);
        app(PaymentService::class)->updateStatus($fresh, 'paid', $this->admin->id);
        $this->assertNull($fresh->refresh()->expires_at);
    }

    public function test_paid_cancel_creates_one_pending_refund_and_is_idempotent(): void
    {
        $order = $this->pendingOrder('bank_transfer', 2);
        app(PaymentService::class)->updateStatus($order, 'paid', $this->admin->id);

        $this->actingAs($this->admin)->postJson('/api/v1/admin/orders/'.$order->id.'/cancel')->assertOk();
        $this->actingAs($this->admin)->postJson('/api/v1/admin/orders/'.$order->id.'/cancel')->assertOk();

        $this->assertDatabaseHas('refunds', ['order_id' => $order->id, 'source' => 'order_cancellation', 'status' => 'pending']);
        $this->assertSame(1, Refund::where('order_id', $order->id)->where('source', 'order_cancellation')->count());
        $refund = Refund::where('order_id', $order->id)->where('source', 'order_cancellation')->firstOrFail();
        $this->expectValidation(fn () => app(RefundService::class)->cancel($refund, $this->admin->id));
        app(RefundService::class)->complete($refund->refresh(), $this->admin->id, 'CANCEL-REFUND');
        $this->assertDatabaseHas('refunds', ['id' => $refund->id, 'status' => 'completed']);
        $this->assertDatabaseHas('payments', ['order_id' => $order->id, 'status' => 'refunded']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'payment_status' => 'refunded']);
        $this->assertSame(0, $this->inventory->refresh()->quantity_reserved);

        $unpaid = $this->pendingOrder('cod', 1);
        $this->actingAs($this->admin)->postJson('/api/v1/admin/orders/'.$unpaid->id.'/cancel')->assertOk();
        $this->assertSame(0, Refund::where('order_id', $unpaid->id)->count());
    }

    public function test_cod_requires_collection_and_bank_transfer_requires_payment_before_completion(): void
    {
        $cod = $this->shippingOrder('cod', false);
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$cod->id.'/status', ['order_status' => 'completed'])->assertUnprocessable();
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$cod->id.'/shipment/status', ['status' => 'delivered'])->assertUnprocessable();
        $this->actingAs($this->admin)->postJson('/api/v1/admin/orders/'.$cod->id.'/confirm-cod-delivery', ['transaction_code' => 'COD-1'])->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $cod->id, 'order_status' => 'completed', 'payment_status' => 'paid']);
        $this->assertDatabaseHas('shipments', ['order_id' => $cod->id, 'status' => 'delivered']);

        $bank = $this->shippingOrder('bank_transfer', false);
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$bank->id.'/shipment/status', ['status' => 'delivered'])->assertUnprocessable();
        $this->assertSame('shipping', $bank->refresh()->order_status);
    }

    public function test_failed_delivery_retry_and_return_reconcile_inventory_and_refund(): void
    {
        $prepaid = $this->shippingOrder('bank_transfer', true);
        $beforeReturn = $this->inventory->refresh()->quantity_on_hand;
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$prepaid->id.'/shipment/status', ['status' => 'delivery_failed', 'reason' => 'No recipient'])->assertOk();
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$prepaid->id.'/shipment/status', ['status' => 'shipped'])->assertOk();
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$prepaid->id.'/shipment/status', ['status' => 'delivery_failed'])->assertOk();
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$prepaid->id.'/shipment/status', ['status' => 'returned', 'reason' => 'Returned to branch'])->assertOk();

        $this->assertSame('cancelled', $prepaid->refresh()->order_status);
        $this->assertSame($beforeReturn + 1, $this->inventory->refresh()->quantity_on_hand);
        $this->assertDatabaseHas('refunds', ['order_id' => $prepaid->id, 'source' => 'order_cancellation', 'status' => 'pending']);
    }

    public function test_return_cannot_complete_until_required_refund_is_completed(): void
    {
        $order = $this->completedOrder(1);
        $item = $order->items()->firstOrFail();
        $service = app(ReturnRequestService::class);
        $return = $service->createRequest($order, ['request_type' => 'return', 'items' => [['order_item_id' => $item->id, 'quantity' => 1, 'reason_code' => 'quality']]], $this->customer->id);
        $service->startReview($return);
        $service->approve($return, $order->branch_id);
        $line = $return->items()->firstOrFail();
        $service->receive($return, [['id' => $line->id, 'condition_status' => 'used', 'restockable' => false]], $this->admin->id);

        $amount = app(RefundCalculatorService::class)->suggestedForReturn($return->refresh());
        $refund = app(RefundService::class)->create($order->payment, ['amount' => $amount, 'method' => 'manual', 'reason' => 'Return refund'], $this->admin->id, $return);
        $this->expectValidation(fn () => $service->complete($return->refresh()));
        app(RefundService::class)->complete($refund, $this->admin->id, 'RF-COMPLETE');
        $service->complete($return->refresh());

        $this->assertDatabaseHas('return_requests', ['id' => $return->id, 'status' => 'completed']);
    }

    public function test_warranty_quantity_same_product_and_handover_consume_exactly_once(): void
    {
        $order = $this->completedOrder(2);
        $item = $order->items()->firstOrFail();
        $item->update(['warranty_days_snapshot' => 30]);
        $replacement = ProductVariant::where('product_id', $item->product_id)->whereKeyNot($item->product_variant_id)->firstOrFail();
        $replacementInventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $replacement->id)->firstOrFail();
        $replacementInventory->update(['quantity_on_hand' => 20, 'quantity_reserved' => 0]);
        $otherProduct = ProductVariant::where('product_id', '!=', $item->product_id)->firstOrFail();
        $service = app(WarrantyService::class);
        $claim = $service->create($order, $item, ['quantity' => 2, 'issue_type' => 'defect', 'description' => 'Two defective units', 'requested_resolution' => 'replacement'], $this->customer->id);
        $service->review($claim);
        $this->expectValidation(fn () => $service->approve($claim, 'replacement', $otherProduct->id, $order->branch_id));
        $service->approve($claim->refresh(), 'replacement', $replacement->id, $order->branch_id);
        $this->assertSame(2, $replacementInventory->refresh()->quantity_reserved);
        $service->receive($claim->refresh());
        $service->startProcessing($claim->refresh());
        $service->markReady($claim->refresh());
        $this->expectValidation(fn () => $service->complete($claim->refresh()));
        $before = $replacementInventory->refresh()->quantity_on_hand;
        $service->handoverReplacement($claim->refresh(), $this->admin->id);
        $service->handoverReplacement($claim->refresh(), $this->admin->id);

        $this->assertSame($before - 2, $replacementInventory->refresh()->quantity_on_hand);
        $this->assertSame(0, $replacementInventory->quantity_reserved);
        $this->assertDatabaseHas('warranty_requests', ['id' => $claim->id, 'quantity' => 2, 'status' => 'completed']);
    }

    public function test_guest_phone_normalization_token_scope_and_cancel_rules(): void
    {
        $guest = $this->pendingOrder('cod', 1, true, '0901234567');
        $other = $this->pendingOrder('cod', 1, true, '0909999999');
        $tracked = $this->postJson('/api/v1/orders/track', ['order_number' => $guest->order_number, 'phone' => '+84 901-234-567'])->assertOk();
        $token = $tracked->json('data.guest_after_sales_token');
        $this->withHeader('X-Guest-Token', $token)->postJson('/api/v1/guest/orders/'.$other->id.'/cancel')->assertUnprocessable();
        $this->withHeader('X-Guest-Token', $token)->postJson('/api/v1/guest/orders/'.$guest->id.'/cancel')->assertOk();
        $this->assertSame('cancelled', $guest->refresh()->order_status);

        $paid = $this->pendingOrder('bank_transfer', 1, true, '0901111111');
        app(PaymentService::class)->updateStatus($paid, 'paid', $this->admin->id);
        $paidToken = app(GuestScopeTokenService::class)->issue('guest_order_after_sales', $paid->id, $paid->customer_phone);
        $this->withHeader('X-Guest-Token', $paidToken)->postJson('/api/v1/guest/orders/'.$paid->id.'/cancel')->assertUnprocessable();
        $this->assertSame('0901234567', PhoneNormalizer::normalize('+84 901-234-567'));
        $this->assertSame('0901234567', PhoneNormalizer::normalize('84 901234567'));
        $this->assertSame('0901234567', PhoneNormalizer::normalize('090-123-4567'));
    }

    public function test_phone_backfill_collision_and_formatted_admin_search(): void
    {
        $legacyOrder = $this->pendingOrder('cod', 1, true, '0903334444');
        DB::table('orders')->where('id', $legacyOrder->id)->update(['customer_phone' => '+84 903-334-444']);
        $now = now();
        DB::table('users')->insert([
            ['name' => 'Collision A', 'email' => 'collision-a@example.com', 'phone' => '0927654321', 'password' => Hash::make('Password1'), 'role' => 'user', 'status' => 'active', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Collision B', 'email' => 'collision-b@example.com', 'phone' => '+84927654321', 'password' => Hash::make('Password1'), 'role' => 'user', 'status' => 'active', 'created_at' => $now, 'updated_at' => $now],
        ]);

        $this->artisan('app:normalize-existing-phones', ['--dry-run' => true])->assertFailed();
        $this->assertSame('+84 903-334-444', DB::table('orders')->where('id', $legacyOrder->id)->value('customer_phone'));
        DB::table('users')->where('email', 'collision-b@example.com')->delete();
        $this->artisan('app:normalize-existing-phones')->assertSuccessful();
        $this->assertSame('0903334444', DB::table('orders')->where('id', $legacyOrder->id)->value('customer_phone'));

        $query = http_build_query(['search' => '+84 903-334-444']);
        $this->actingAs($this->admin)->getJson('/api/v1/admin/orders?'.$query)->assertOk()->assertJsonFragment(['id' => $legacyOrder->id]);
        $customer = User::factory()->create(['role' => 'user', 'status' => 'active', 'phone' => '0907778888']);
        $query = http_build_query(['search' => '+84 907 778 888']);
        $this->actingAs($this->admin)->getJson('/api/v1/admin/customers?'.$query)->assertOk()->assertJsonFragment(['id' => $customer->id]);
    }

    public function test_guest_warranty_media_is_private_and_token_scoped(): void
    {
        Storage::fake('local');
        $order = $this->completedOrder(1);
        $order->update(['user_id' => null, 'customer_phone' => '0905555555']);
        $item = $order->items()->firstOrFail();
        $token = app(GuestScopeTokenService::class)->issue('guest_order_after_sales', $order->id, $order->customer_phone);
        $this->withHeader('X-Guest-Token', $token)->post('/api/v1/guest/warranties', [
            'order_id' => $order->id, 'order_item_id' => $item->id, 'quantity' => 1,
            'issue_type' => 'defect', 'description' => 'Guest evidence',
            'images' => [UploadedFile::fake()->image('proof.jpg')],
        ])->assertCreated();

        $medium = AfterSalesMedium::firstOrFail();
        Storage::disk('local')->assertExists($medium->path);
        $this->get('/api/v1/guest/after-sales-media/'.$medium->id)->assertForbidden();
    }

    public function test_appointment_conflicts_password_and_admin_order_contracts(): void
    {
        Carbon::setTestNow('2026-08-29 00:00:00');
        $branch = $this->inventory->branch;
        $serviceModel = Service::firstOrCreate(['slug' => 'phase-five-one'], ['name' => 'Phase 5.1 Service', 'price' => 0, 'duration_minutes' => 30, 'status' => 'active']);
        $date = Carbon::parse('2026-09-01', 'Asia/Ho_Chi_Minh');
        AppointmentSchedule::where('branch_id', $branch->id)->where('day_of_week', $date->dayOfWeek)->delete();
        $schedule = AppointmentSchedule::create(['branch_id' => $branch->id, 'day_of_week' => $date->dayOfWeek, 'start_time' => '09:00', 'end_time' => '12:00', 'slot_minutes' => 30, 'capacity' => 1, 'is_active' => true]);
        $appointment = app(AppointmentService::class)->create(['branch_id' => $branch->id, 'service_id' => $serviceModel->id, 'start_at' => '2026-09-01T09:30:00+07:00', 'customer_name' => 'Conflict', 'customer_phone' => '090 222 2222']);
        $this->actingAs($this->admin)->postJson('/api/v1/admin/appointment-blocks', ['branch_id' => $branch->id, 'start_at' => '2026-09-01T09:00:00+07:00', 'end_at' => '2026-09-01T10:00:00+07:00'])->assertUnprocessable();
        $baseSchedule = ['branch_id' => $branch->id, 'day_of_week' => $date->dayOfWeek, 'start_time' => '09:00', 'end_time' => '12:00', 'capacity' => 1, 'is_active' => true];
        $this->actingAs($this->admin)->putJson('/api/v1/admin/appointment-schedules/'.$schedule->id, $baseSchedule + ['slot_minutes' => 40])->assertUnprocessable();
        $this->actingAs($this->admin)->putJson('/api/v1/admin/appointment-schedules/'.$schedule->id, $baseSchedule + ['slot_minutes' => 15])->assertOk();
        $this->actingAs($this->admin)->putJson('/api/v1/admin/appointment-schedules/'.$schedule->id, array_merge($baseSchedule, ['start_time' => '09:05', 'slot_minutes' => 15]))->assertUnprocessable();
        $this->actingAs($this->admin)->deleteJson('/api/v1/admin/appointment-schedules/'.$schedule->id)->assertUnprocessable();
        $this->assertDatabaseHas('appointments', ['id' => $appointment->id]);
        $query = http_build_query(['phone' => '+84 902 222 222']);
        $this->actingAs($this->admin)->getJson('/api/v1/admin/appointments?'.$query)->assertOk()->assertJsonFragment(['id' => $appointment->id]);

        $staff = User::factory()->create(['role' => 'staff', 'status' => 'active', 'password' => 'Oldpass1']);
        config(['session.driver' => 'database']);
        DB::table('sessions')->insert([
            ['id' => 'staff-session-a', 'user_id' => $staff->id, 'ip_address' => null, 'user_agent' => null, 'payload' => '', 'last_activity' => now()->timestamp],
            ['id' => 'staff-session-b', 'user_id' => $staff->id, 'ip_address' => null, 'user_agent' => null, 'payload' => '', 'last_activity' => now()->timestamp],
        ]);
        $this->actingAs($staff)->patchJson('/api/v1/admin/account/password', ['current_password' => 'wrong', 'new_password' => 'Newpass2', 'new_password_confirmation' => 'Newpass2'])->assertUnprocessable();
        $this->actingAs($staff)->patchJson('/api/v1/admin/account/password', ['current_password' => 'Oldpass1', 'new_password' => 'Newpass2', 'new_password_confirmation' => 'Newpass2'])->assertOk();
        $this->assertTrue(Hash::check('Newpass2', $staff->refresh()->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'staff-session-a']);
        $this->assertDatabaseMissing('sessions', ['id' => 'staff-session-b']);
        config(['session.driver' => 'array']);
        $this->actingAs($this->customer)->patchJson('/api/v1/admin/account/password', ['current_password' => 'password', 'new_password' => 'Newpass2', 'new_password_confirmation' => 'Newpass2'])->assertForbidden();

        $beforeReserved = $this->inventory->refresh()->quantity_reserved;
        $response = $this->actingAs($this->admin)->postJson('/api/v1/admin/orders', [
            'branch_id' => $branch->id, 'customer_name' => 'Manual Customer', 'customer_email' => 'manual@example.com', 'customer_phone' => '+84903334444',
            'province' => 'HCM', 'district' => '1', 'ward' => 'Ben Nghe', 'shipping_address' => '10 Main Street',
            'items' => [['product_variant_id' => $this->variant->id, 'quantity' => 1]], 'shipping_fee' => 0, 'payment_method' => 'cod',
        ])->assertCreated()->assertJsonPath('data.order_source', 'admin');
        $orderId = $response->json('data.id');
        $this->assertSame($beforeReserved + 1, $this->inventory->refresh()->quantity_reserved);
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$orderId, ['customer_name' => 'Edited Customer'])->assertOk();
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$orderId.'/status', ['order_status' => 'confirmed'])->assertOk();
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$orderId, ['customer_name' => 'Forbidden'])->assertUnprocessable();

        Carbon::setTestNow();
    }

    private function pendingOrder(string $method, int $quantity, bool $guest = false, string $phone = '0900000000'): Order
    {
        $order = Order::create([
            'order_number' => 'P51-'.Str::upper(Str::random(10)), 'user_id' => $guest ? null : $this->customer->id,
            'branch_id' => $this->inventory->branch_id, 'customer_name' => 'Test Customer', 'customer_email' => 'test@example.com',
            'customer_phone' => $phone, 'province' => 'HCM', 'district' => '1', 'ward' => 'Ben Nghe', 'shipping_address' => '1 Test Street',
            'subtotal' => 100 * $quantity, 'discount_amount' => 0, 'shipping_fee' => 0, 'total_amount' => 100 * $quantity,
            'payment_method' => $method, 'payment_status' => 'unpaid', 'order_status' => 'pending', 'expires_at' => now()->addMinutes(30),
        ]);
        $order->items()->create([
            'product_id' => $this->variant->product_id, 'product_variant_id' => $this->variant->id, 'product_name' => $this->variant->product->name,
            'variant_description' => $this->variant->sku, 'variant_snapshot' => [], 'warranty_days_snapshot' => 30, 'sku' => $this->variant->sku,
            'barcode' => $this->variant->barcode, 'unit_price' => 100, 'cost_price_snapshot' => 50, 'quantity' => $quantity, 'line_total' => 100 * $quantity,
        ]);
        $this->inventory->increment('quantity_reserved', $quantity);
        Payment::create(['order_id' => $order->id, 'method' => $method, 'provider' => 'manual', 'amount' => $order->total_amount, 'status' => 'pending']);
        $order->statusHistories()->create(['from_status' => null, 'to_status' => 'pending', 'created_at' => now()]);

        return $order->load('items', 'payment');
    }

    private function shippingOrder(string $method, bool $paid): Order
    {
        $order = $this->pendingOrder($method, 1);
        if ($paid) {
            app(PaymentService::class)->updateStatus($order, 'paid', $this->admin->id);
        }
        app(OrderLifecycleService::class)->transition($order, OrderStatus::Confirmed, $this->admin->id);
        app(OrderLifecycleService::class)->transition($order->refresh(), OrderStatus::Processing, $this->admin->id);
        app(ShipmentService::class)->save($order->refresh(), ['carrier' => 'Manual', 'tracking_number' => 'TRACK-'.$order->id], $this->admin->id);
        app(ShipmentService::class)->updateStatus($order->refresh(), 'shipped', $this->admin->id);

        return $order->refresh();
    }

    private function completedOrder(int $quantity): Order
    {
        $order = $this->pendingOrder('bank_transfer', $quantity);
        app(PaymentService::class)->updateStatus($order, 'paid', $this->admin->id);
        app(OrderLifecycleService::class)->transition($order, OrderStatus::Confirmed, $this->admin->id);
        $order->update(['order_status' => 'completed', 'completed_at' => now()]);
        Shipment::create(['order_id' => $order->id, 'carrier' => 'Manual', 'tracking_number' => 'DONE-'.$order->id, 'status' => 'delivered', 'shipped_at' => now(), 'delivered_at' => now(), 'created_by' => $this->admin->id]);

        return $order->refresh()->load('items', 'payment', 'shipment');
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
