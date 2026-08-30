<?php

namespace Tests\Feature;

use App\Models\Inventory;
use App\Models\Order;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseSixBusinessPolishTest extends TestCase
{
    use RefreshDatabase;

    public function test_buy_again_uses_current_price_returns_partial_result_and_protects_ownership(): void
    {
        $this->seed();
        $owner = User::where('email', 'user@namhair.local')->firstOrFail();
        $other = User::factory()->customer()->create();
        $order = Order::where('user_id', $owner->id)->firstOrFail();
        $oldItem = $order->items()->with('product', 'variant')->firstOrFail();
        $oldItem->product->update(['status' => 'inactive']);
        $activeProduct = Product::where('status', 'active')->whereKeyNot($oldItem->product_id)->with('variants.inventories')->firstOrFail();
        $variant = $activeProduct->variants->firstOrFail();
        $variant->update(['price' => 2999000, 'sale_price' => null]);
        $order->items()->create([
            'product_id' => $activeProduct->id, 'product_variant_id' => $variant->id, 'product_name' => $activeProduct->name,
            'variant_description' => $variant->sku, 'sku' => $variant->sku, 'barcode' => $variant->barcode,
            'unit_price' => 100000, 'quantity' => 1, 'line_total' => 100000,
        ]);

        $this->actingAs($other)->postJson("/api/v1/account/orders/{$order->order_number}/buy-again")->assertNotFound();
        $response = $this->actingAs($owner)->postJson("/api/v1/account/orders/{$order->order_number}/buy-again")->assertOk();

        $response->assertJsonCount(1, 'data.added')->assertJsonCount(1, 'data.skipped')
            ->assertJsonPath('data.added.0.current_price', 2999000)
            ->assertJsonPath('data.skipped.0.reason', 'product_inactive');
        $this->assertDatabaseHas('cart_items', ['product_variant_id' => $variant->id, 'unit_price' => 2999000, 'quantity' => 1]);
    }

    public function test_variant_wishlist_is_idempotent_and_owned(): void
    {
        $this->seed();
        $owner = User::where('email', 'user@namhair.local')->firstOrFail();
        $other = User::factory()->customer()->create();
        $product = Product::where('status', 'active')->with('variants')->firstOrFail();
        $variant = $product->variants->firstOrFail();

        $first = $this->actingAs($owner)->postJson("/api/v1/account/wishlist/{$product->id}", ['product_variant_id' => $variant->id])->assertCreated();
        $this->actingAs($owner)->postJson("/api/v1/account/wishlist/{$product->id}", ['product_variant_id' => $variant->id])->assertOk();
        $this->actingAs($owner)->postJson("/api/v1/account/wishlist/{$product->id}", ['product_variant_id' => null])->assertCreated();
        $this->assertDatabaseCount('wishlists', 2);
        $this->actingAs($other)->deleteJson('/api/v1/account/wishlist/items/'.$first->json('data.id'))->assertNotFound();
        $this->actingAs($owner)->deleteJson('/api/v1/account/wishlist/items/'.$first->json('data.id'))->assertOk();
    }

    public function test_hair_finder_is_deterministic_and_excludes_inactive_products(): void
    {
        $this->seed();
        $settings = StoreSetting::current();
        $config = $settings->hair_finder_config;
        $config['content']['title'] = 'Tư vấn tóc theo cấu hình DB';
        $config['questions'][0]['choices'] = [['value' => 'consultation', 'label' => 'Tư vấn riêng']];
        $settings->update(['hair_finder_config' => $config]);

        $this->getJson('/api/v1/hair-finder/options')->assertOk()
            ->assertJsonPath('data.content.title', 'Tư vấn tóc theo cấu hình DB')
            ->assertJsonPath('data.questions.0.choices.0.value', 'consultation');
        $this->postJson('/api/v1/hair-finder/recommendations', ['usage' => 'daily'])->assertUnprocessable();
        $this->postJson('/api/v1/hair-finder/recommendations', ['usage' => 'consultation'])->assertOk();

        $inactive = Product::where('status', 'active')->firstOrFail();
        $inactive->update(['status' => 'inactive']);
        $payload = ['length' => 'short', 'preferences' => ['natural', 'easy_care']];

        $first = $this->postJson('/api/v1/hair-finder/recommendations', $payload)->assertOk()->json('data');
        $second = $this->postJson('/api/v1/hair-finder/recommendations', $payload)->assertOk()->json('data');

        $this->assertSame(array_column($first, 'score'), array_column($second, 'score'));
        $this->assertSame(array_column(array_column($first, 'product'), 'id'), array_column(array_column($second, 'product'), 'id'));
        $this->assertNotContains($inactive->id, array_column(array_column($first, 'product'), 'id'));
    }

    public function test_global_search_is_admin_only_permission_aware_and_limited(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $customer = User::where('role', 'user')->firstOrFail();
        $staff = User::factory()->staff()->create();
        $order = Order::firstOrFail();

        $this->actingAs($customer)->getJson('/api/v1/admin/global-search?q=NH')->assertForbidden();
        $this->actingAs($staff)->getJson('/api/v1/admin/global-search?q=NH')->assertForbidden();
        $response = $this->actingAs($admin)->getJson('/api/v1/admin/global-search?q='.$order->order_number)->assertOk();
        $response->assertJsonPath('data.orders.0.id', $order->id);
        $this->assertLessThanOrEqual(5, count($response->json('data.products') ?? []));
    }

    public function test_customer_notes_are_admin_only_validated_and_audited(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $customer = User::where('role', 'user')->firstOrFail();

        $this->actingAs($customer)->postJson("/api/v1/admin/customers/{$customer->id}/notes", ['content' => 'hidden'])->assertForbidden();
        $this->actingAs($admin)->postJson("/api/v1/admin/customers/{$customer->id}/notes", ['content' => ''])->assertUnprocessable();
        $created = $this->actingAs($admin)->postJson("/api/v1/admin/customers/{$customer->id}/notes", ['content' => 'Gọi trước khi giao.'])->assertCreated();
        $this->assertDatabaseHas('customer_notes', ['id' => $created->json('data.id'), 'customer_id' => $customer->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'customer_note.created', 'module' => 'customers']);
    }

    public function test_duplicate_product_copies_structure_but_not_inventory_or_public_status(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $source = Product::where('status', 'active')->with('variants')->firstOrFail();

        $response = $this->actingAs($admin)->postJson("/api/v1/admin/products/{$source->id}/duplicate")->assertCreated();
        $copy = Product::with('variants.inventories')->findOrFail($response->json('data.id'));

        $this->assertNotSame($source->id, $copy->id);
        $this->assertSame('draft', $copy->status);
        $this->assertNotSame($source->slug, $copy->slug);
        $this->assertNotSame($source->base_sku, $copy->base_sku);
        $this->assertCount($source->variants->count(), $copy->variants);
        $this->assertSame(0, $copy->variants->sum(fn ($variant) => $variant->inventories->count()));
        $this->assertSame($copy->variants->count(), $copy->variants->pluck('sku')->unique()->count());
    }

    public function test_attention_center_counts_match_current_database(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $expectedPending = Order::where('order_status', 'pending')->count();
        $expectedLowStock = Inventory::whereRaw('(quantity_on_hand - quantity_reserved) <= reorder_level')->count();

        $response = $this->actingAs($admin)->getJson('/api/v1/admin/dashboard/attention')->assertOk();
        $response->assertJsonPath('data.counters.pending_orders', $expectedPending)
            ->assertJsonPath('data.counters.low_stock', $expectedLowStock);
    }
}
