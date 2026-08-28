<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\OrderLifecycleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private User $admin;

    private Branch $branch;

    private Product $product;

    private ProductVariant $variant;

    private Inventory $inventory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->branch = Branch::create(['name' => 'Main', 'code' => 'MAIN', 'is_default' => true, 'is_active' => true]);
        [$this->product, $this->variant] = $this->createProduct('primary');
        $this->inventory = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_variant_id' => $this->variant->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 0,
            'reorder_level' => 3,
        ]);
    }

    public function test_customer_cancel_pending_order_releases_reserved_stock(): void
    {
        $order = $this->createOrder('pending', 2);
        $this->inventory->update(['quantity_reserved' => 2]);

        $this->actingAs($this->customer)->postJson("/api/v1/account/orders/{$order->order_number}/cancel")->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'order_status' => 'cancelled']);
        $this->assertInventory(10, 0);
        $this->assertDatabaseHas('inventory_transactions', ['type' => 'cancel_release', 'reference_type' => Order::class, 'reference_id' => $order->id]);
    }

    public function test_admin_cancel_pending_order_releases_reserved_stock(): void
    {
        $order = $this->createOrder('pending', 2);
        $this->inventory->update(['quantity_reserved' => 2]);

        $this->actingAs($this->admin)->postJson("/api/v1/admin/orders/{$order->id}/cancel")->assertOk();

        $this->assertInventory(10, 0);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'order_status' => 'cancelled']);
    }

    public function test_cancel_order_releases_coupon_usage(): void
    {
        $order = $this->createOrder('pending', 2);
        $this->inventory->update(['quantity_reserved' => 2]);
        $coupon = $this->attachCoupon($order, 5);

        app(OrderLifecycleService::class)->cancel($order, $this->customer->id);

        $this->assertSame(4, $coupon->refresh()->used_count);
        $this->assertDatabaseMissing('coupon_usages', ['order_id' => $order->id]);
    }

    public function test_cancel_without_coupon_succeeds(): void
    {
        $order = $this->createOrder('pending', 1);
        $this->inventory->update(['quantity_reserved' => 1]);

        app(OrderLifecycleService::class)->cancel($order, $this->customer->id);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'order_status' => 'cancelled']);
    }

    public function test_cancel_twice_is_idempotent(): void
    {
        $order = $this->createOrder('pending', 2);
        $this->inventory->update(['quantity_reserved' => 2]);
        $coupon = $this->attachCoupon($order, 1);
        $service = app(OrderLifecycleService::class);

        $service->cancel($order, $this->customer->id);
        $service->cancel($order->refresh(), $this->customer->id);

        $this->assertInventory(10, 0);
        $this->assertSame(0, $coupon->refresh()->used_count);
        $this->assertSame(1, InventoryTransaction::where('type', 'cancel_release')->where('reference_id', $order->id)->count());
    }

    public function test_confirm_consumes_reserved_stock_once(): void
    {
        $order = $this->createOrder('pending', 2);
        $this->inventory->update(['quantity_reserved' => 2]);

        $this->actingAs($this->admin)->patchJson("/api/v1/admin/orders/{$order->id}/status", ['order_status' => 'confirmed'])->assertOk();
        $this->actingAs($this->admin)->patchJson("/api/v1/admin/orders/{$order->id}/status", ['order_status' => 'confirmed'])->assertUnprocessable();

        $this->assertInventory(8, 0);
        $this->assertSame(1, InventoryTransaction::where('type', 'sale')->where('reference_id', $order->id)->count());
    }

    public function test_expired_pending_order_is_cancelled(): void
    {
        $order = $this->createOrder('pending', 1, now()->subMinute());
        $this->inventory->update(['quantity_reserved' => 1]);

        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'order_status' => 'cancelled']);
    }

    public function test_non_expired_pending_order_is_untouched(): void
    {
        $order = $this->createOrder('pending', 1, now()->addMinute());
        $this->inventory->update(['quantity_reserved' => 1]);

        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'order_status' => 'pending']);
        $this->assertInventory(10, 1);
    }

    public function test_expired_order_releases_inventory(): void
    {
        $this->createOrder('pending', 2, now()->subMinute());
        $this->inventory->update(['quantity_reserved' => 2]);

        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertInventory(10, 0);
    }

    public function test_expired_order_releases_coupon(): void
    {
        $order = $this->createOrder('pending', 1, now()->subMinute());
        $this->inventory->update(['quantity_reserved' => 1]);
        $coupon = $this->attachCoupon($order, 2);

        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertSame(1, $coupon->refresh()->used_count);
        $this->assertDatabaseMissing('coupon_usages', ['order_id' => $order->id]);
    }

    public function test_completed_order_is_not_expired(): void
    {
        $order = $this->createOrder('completed', 1, now()->subMinute());

        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'order_status' => 'completed']);
    }

    public function test_top_products_excludes_pending_orders(): void
    {
        $this->createOrder('pending', 100);

        $this->actingAs($this->admin)->getJson('/api/v1/admin/dashboard/top-products')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_top_products_excludes_cancelled_orders(): void
    {
        $this->createOrder('cancelled', 100);

        $this->actingAs($this->admin)->getJson('/api/v1/admin/dashboard/top-products')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_top_products_includes_completed_orders(): void
    {
        $order = $this->createOrder('completed', 3);

        $this->actingAs($this->admin)->getJson('/api/v1/admin/dashboard/top-products')
            ->assertOk()
            ->assertJsonPath('data.0.product_id', $this->product->id)
            ->assertJsonPath('data.0.quantity', 3)
            ->assertJsonPath('data.0.revenue', (int) $order->items->first()->line_total);
    }

    public function test_reorder_level_uses_store_setting(): void
    {
        StoreSetting::current()->update(['low_stock_threshold' => 7]);
        $this->inventory->delete();

        $this->actingAs($this->admin)->postJson('/api/v1/admin/inventory/adjust', [
            'branch_id' => $this->branch->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 5,
            'type' => 'import',
        ])->assertOk();

        $this->assertDatabaseHas('inventories', ['product_variant_id' => $this->variant->id, 'reorder_level' => 7]);
    }

    public function test_reorder_level_falls_back_to_three(): void
    {
        StoreSetting::query()->delete();
        $this->inventory->delete();

        $this->actingAs($this->admin)->postJson('/api/v1/admin/inventory/adjust', [
            'branch_id' => $this->branch->id,
            'product_variant_id' => $this->variant->id,
            'quantity' => 5,
            'type' => 'import',
        ])->assertOk();

        $this->assertDatabaseHas('inventories', ['product_variant_id' => $this->variant->id, 'reorder_level' => 3]);
    }

    public function test_admin_cancel_confirmed_order_restocks_consumed_inventory(): void
    {
        $order = $this->createOrder('confirmed', 2);
        $this->inventory->update(['quantity_on_hand' => 8, 'quantity_reserved' => 0]);

        $this->actingAs($this->admin)->postJson("/api/v1/admin/orders/{$order->id}/cancel")->assertOk();

        $this->assertInventory(10, 0);
        $this->assertDatabaseHas('inventory_transactions', ['type' => 'cancel_release', 'quantity' => 2, 'reference_id' => $order->id]);
    }

    private function createProduct(string $suffix): array
    {
        $category = Category::create(['name' => "Category {$suffix}", 'slug' => "category-{$suffix}", 'is_active' => true]);
        $product = Product::create([
            'category_id' => $category->id,
            'name' => "Product {$suffix}",
            'slug' => "product-{$suffix}",
            'base_sku' => "BASE-{$suffix}",
            'description' => 'Test product',
            'status' => 'active',
        ]);
        $variant = $product->variants()->create(['sku' => "SKU-{$suffix}", 'price' => 100000, 'status' => 'active']);

        return [$product, $variant];
    }

    private function createOrder(string $status, int $quantity, mixed $expiresAt = null): Order
    {
        $order = Order::create([
            'order_number' => 'TEST-'.Str::upper(Str::random(10)),
            'user_id' => $this->customer->id,
            'branch_id' => $this->branch->id,
            'customer_name' => $this->customer->name,
            'customer_email' => $this->customer->email,
            'customer_phone' => '0900000000',
            'province' => 'Test',
            'district' => 'Test',
            'ward' => 'Test',
            'shipping_address' => 'Test address',
            'subtotal' => 100000 * $quantity,
            'discount_amount' => 0,
            'shipping_fee' => 0,
            'total_amount' => 100000 * $quantity,
            'payment_method' => 'cod',
            'payment_status' => 'unpaid',
            'order_status' => $status,
            'expires_at' => $expiresAt,
            'completed_at' => $status === 'completed' ? now() : null,
            'cancelled_at' => $status === 'cancelled' ? now() : null,
        ]);
        $order->items()->create([
            'product_id' => $this->product->id,
            'product_variant_id' => $this->variant->id,
            'product_name' => $this->product->name,
            'variant_description' => $this->variant->sku,
            'sku' => $this->variant->sku,
            'unit_price' => 100000,
            'quantity' => $quantity,
            'line_total' => 100000 * $quantity,
        ]);

        return $order->load('items');
    }

    private function attachCoupon(Order $order, int $usedCount): Coupon
    {
        $coupon = Coupon::create([
            'code' => 'TEST'.Str::upper(Str::random(6)),
            'type' => 'fixed',
            'value' => 10000,
            'used_count' => $usedCount,
            'is_active' => true,
        ]);
        DB::table('coupon_usages')->insert([
            'coupon_id' => $coupon->id,
            'user_id' => $this->customer->id,
            'order_id' => $order->id,
            'discount_amount' => 10000,
            'created_at' => now(),
        ]);

        return $coupon;
    }

    private function assertInventory(int $onHand, int $reserved): void
    {
        $inventory = $this->inventory->refresh();
        $this->assertSame($onHand, $inventory->quantity_on_hand);
        $this->assertSame($reserved, $inventory->quantity_reserved);
    }
}
