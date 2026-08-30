<?php

namespace Tests\Feature;

use App\Models\CustomerTag;
use App\Models\Order;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StaffRole;
use App\Models\StoreSetting;
use App\Models\User;
use Database\Seeders\HairFinderConfigSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PhaseSixHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_hair_finder_requires_same_active_in_stock_variant(): void
    {
        $this->seed();
        $this->expandHairFinderLimit();
        $products = Product::where('status', 'active')->with('variants.inventories')->take(3)->get();
        [$splitAvailability, $purchasable, $inactive] = $products;

        $splitAvailability->variants->each(fn (ProductVariant $variant) => $variant->update(['status' => 'inactive']));
        $splitAvailability->variants[0]->update(['status' => 'active']);
        $this->setStock($splitAvailability->variants[0], 0);
        $this->setStock($splitAvailability->variants[1], 10);

        $purchasable->variants->each(function (ProductVariant $variant) {
            $variant->update(['status' => 'inactive']);
            $this->setStock($variant, 0);
        });
        $purchasable->variants[0]->update(['status' => 'active']);
        $this->setStock($purchasable->variants[0], 5);

        $inactive->update(['status' => 'inactive']);
        $inactive->variants[0]->update(['status' => 'active']);
        $this->setStock($inactive->variants[0], 5);

        $ids = collect($this->postJson('/api/v1/hair-finder/recommendations')->assertOk()->json('data'))->pluck('product.id');
        $this->assertNotContains($splitAvailability->id, $ids);
        $this->assertContains($purchasable->id, $ids);
        $this->assertNotContains($inactive->id, $ids);
    }

    public function test_hair_finder_budget_must_match_the_same_purchasable_variant(): void
    {
        $this->seed();
        $this->expandHairFinderLimit();
        $product = Product::where('status', 'active')->with('variants.inventories')->firstOrFail();
        $cheapOutOfStock = $product->variants[0];
        $availableOutsideBudget = $product->variants[1];
        $cheapOutOfStock->update(['status' => 'active', 'price' => 100, 'sale_price' => null]);
        $availableOutsideBudget->update(['status' => 'active', 'price' => 1000, 'sale_price' => null]);
        $this->setStock($cheapOutOfStock, 0);
        $this->setStock($availableOutsideBudget, 10);

        $ids = collect($this->postJson('/api/v1/hair-finder/recommendations', ['budget_min' => 50, 'budget_max' => 200])->assertOk()->json('data'))->pluck('product.id');
        $this->assertNotContains($product->id, $ids);
    }

    public function test_hair_finder_is_empty_without_config_and_seeder_preserves_custom_config(): void
    {
        $this->seed();
        $settings = StoreSetting::current();
        $settings->update(['hair_finder_config' => null]);
        $this->getJson('/api/v1/hair-finder/options')
            ->assertOk()
            ->assertJsonPath('data.content', [])
            ->assertJsonPath('data.questions', []);

        (new HairFinderConfigSeeder)->run();
        $custom = $settings->fresh()->hair_finder_config;
        $custom['content']['title'] = 'Custom Hair Finder';
        $settings->update(['hair_finder_config' => $custom]);
        (new HairFinderConfigSeeder)->run();
        $this->assertSame('Custom Hair Finder', $settings->fresh()->hair_finder_config['content']['title']);
    }

    public function test_wishlist_database_guarantees_product_and_variant_idempotency(): void
    {
        $this->seed();
        $user = User::where('role', 'user')->firstOrFail();
        $product = Product::where('status', 'active')->with('variants')->firstOrFail();
        $variant = $product->variants->firstOrFail();

        $this->actingAs($user)->postJson('/api/v1/account/wishlist/'.$product->id, ['product_variant_id' => null])->assertCreated();
        $this->actingAs($user)->postJson('/api/v1/account/wishlist/'.$product->id, ['product_variant_id' => null])->assertOk();
        $this->actingAs($user)->postJson('/api/v1/account/wishlist/'.$product->id, ['product_variant_id' => $variant->id])->assertCreated();
        $this->actingAs($user)->postJson('/api/v1/account/wishlist/'.$product->id, ['product_variant_id' => $variant->id])->assertOk();
        $this->assertDatabaseCount('wishlists', 2);

        try {
            DB::table('wishlists')->insert(['user_id' => $user->id, 'product_id' => $product->id, 'product_variant_id' => null, 'created_at' => now()]);
            $this->fail('Database accepted a duplicate product-level wishlist row.');
        } catch (QueryException) {
            $this->assertDatabaseCount('wishlists', 2);
        }
    }

    public function test_buy_again_status_rule_is_exposed_and_enforced(): void
    {
        $this->seed();
        $user = User::where('role', 'user')->firstOrFail();
        $order = Order::where('user_id', $user->id)->firstOrFail();

        foreach (['pending', 'processing'] as $status) {
            $order->update(['order_status' => $status]);
            $this->actingAs($user)->getJson('/api/v1/account/orders/'.$order->order_number)->assertOk()->assertJsonPath('data.can_buy_again', false);
            $this->actingAs($user)->postJson('/api/v1/account/orders/'.$order->order_number.'/buy-again')->assertUnprocessable();
        }

        foreach (['cancelled', 'completed'] as $status) {
            $order->update(['order_status' => $status]);
            $this->actingAs($user)->getJson('/api/v1/account/orders/'.$order->order_number)->assertOk()->assertJsonPath('data.can_buy_again', true);
            $this->actingAs($user)->postJson('/api/v1/account/orders/'.$order->order_number.'/buy-again')->assertOk();
        }
    }

    public function test_customer_note_permissions_update_delete_and_tag_cleanup(): void
    {
        $this->seed();
        $customer = User::where('role', 'user')->firstOrFail();
        $staff = User::factory()->staff()->create();
        $this->actingAs($staff)->postJson('/api/v1/admin/customers/'.$customer->id.'/notes', ['content' => 'Denied'])->assertForbidden();

        $role = StaffRole::create(['name' => 'CRM hardening', 'slug' => 'crm-hardening', 'is_system' => false]);
        $role->permissions()->attach(Permission::where('key', 'customers.status.manage')->firstOrFail());
        $staff->staffRoles()->attach($role);
        $note = $this->actingAs($staff)->postJson('/api/v1/admin/customers/'.$customer->id.'/notes', ['content' => 'Original'])->assertCreated();
        $noteId = $note->json('data.id');
        $this->actingAs($staff)->putJson('/api/v1/admin/customers/'.$customer->id.'/notes/'.$noteId, ['content' => 'Updated'])->assertOk();
        $this->assertDatabaseHas('customer_notes', ['id' => $noteId, 'content' => 'Updated']);
        $this->actingAs($staff)->deleteJson('/api/v1/admin/customers/'.$customer->id.'/notes/'.$noteId)->assertOk();
        $this->assertDatabaseMissing('customer_notes', ['id' => $noteId]);

        $tag = CustomerTag::create(['name' => 'Temporary']);
        $customer->customerTags()->attach($tag);
        $this->actingAs($staff)->deleteJson('/api/v1/admin/customer-tags/'.$tag->id)->assertOk();
        $this->assertDatabaseHas('users', ['id' => $customer->id]);
        $this->assertDatabaseMissing('customer_tags', ['id' => $tag->id]);
        $this->assertDatabaseMissing('customer_tag_user', ['customer_tag_id' => $tag->id, 'user_id' => $customer->id]);
    }

    public function test_attention_center_only_returns_counts_the_staff_can_access(): void
    {
        $this->seed();
        $staff = User::factory()->staff()->create();
        $role = StaffRole::create(['name' => 'Dashboard only', 'slug' => 'dashboard-only', 'is_system' => false]);
        $role->permissions()->attach(Permission::where('key', 'dashboard.view')->firstOrFail());
        $staff->staffRoles()->attach($role);

        $this->actingAs($staff)->getJson('/api/v1/admin/dashboard/attention')->assertOk()
            ->assertJsonPath('data.items', [])
            ->assertJsonPath('data.counters', []);

        $role->permissions()->attach(Permission::where('key', 'orders.view')->firstOrFail());
        $response = $this->actingAs($staff)->getJson('/api/v1/admin/dashboard/attention')->assertOk();
        $this->assertSame(['pending_orders'], collect($response->json('data.items'))->pluck('key')->all());
        $this->assertArrayNotHasKey('returns_requested', $response->json('data.counters'));
    }

    private function expandHairFinderLimit(): void
    {
        $settings = StoreSetting::current();
        $config = $settings->hair_finder_config;
        $config['scoring']['result_limit'] = 100;
        $settings->update(['hair_finder_config' => $config]);
    }

    private function setStock(ProductVariant $variant, int $quantity): void
    {
        $variant->inventories()->update(['quantity_on_hand' => $quantity, 'quantity_reserved' => 0]);
        $variant->load('inventories');
    }
}
