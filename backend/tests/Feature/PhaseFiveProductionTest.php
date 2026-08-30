<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class PhaseFiveProductionTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_products_never_expose_cost_but_admin_products_do(): void
    {
        $this->seed();
        $product = Product::where('status', 'active')->firstOrFail();

        $publicList = $this->getJson('/api/v1/products')->assertOk()->json();
        $publicDetail = $this->getJson('/api/v1/products/'.$product->slug)->assertOk()->json();
        $this->assertJsonDoesNotContainKey($publicList, 'cost_price');
        $this->assertJsonDoesNotContainKey($publicDetail, 'cost_price');

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->getJson('/api/v1/admin/products')
            ->assertOk()
            ->assertJsonPath('data.data.0.variants.0.cost_price', fn ($value) => $value !== null);
    }

    public function test_public_tracking_only_returns_guest_orders_and_uses_generic_not_found(): void
    {
        $customer = User::factory()->customer()->create();
        $registered = $this->order('REG-001', $customer->id, '0901111111');
        $guest = $this->order('GST-001', null, '0902222222');

        $this->postJson('/api/v1/orders/track', ['order_number' => $guest->order_number, 'phone' => $guest->customer_phone])
            ->assertOk()->assertJsonPath('data.order_number', 'GST-001');
        $this->postJson('/api/v1/orders/track', ['order_number' => $registered->order_number, 'phone' => $registered->customer_phone])
            ->assertNotFound()->assertJsonPath('message', 'Không tìm thấy đơn hàng phù hợp.');
        $this->postJson('/api/v1/orders/track', ['order_number' => $guest->order_number, 'phone' => '0999999999'])
            ->assertNotFound()->assertJsonPath('message', 'Không tìm thấy đơn hàng phù hợp.');
    }

    public function test_auth_and_admin_login_are_rate_limited(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/v1/auth/login', ['email' => 'limited@example.com', 'password' => 'wrong'])->assertStatus(422);
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'limited@example.com', 'password' => 'wrong'])->assertTooManyRequests();

        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/v1/admin/auth/login', ['email' => 'admin-limited@example.com', 'password' => 'wrong'])->assertStatus(422);
        }
        $this->postJson('/api/v1/admin/auth/login', ['email' => 'admin-limited@example.com', 'password' => 'wrong'])->assertTooManyRequests();
    }

    public function test_password_reset_email_endpoints_are_truthful_when_disabled(): void
    {
        config(['features.password_reset_email' => false]);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'customer@example.com'])
            ->assertStatus(503)->assertJsonPath('errors.contact_url.0', '/lien-he');
        $this->postJson('/api/v1/auth/reset-password', [])->assertStatus(503);
    }

    public function test_only_super_admin_can_reset_customer_password_without_audit_secret_leak(): void
    {
        $customer = User::factory()->customer()->create(['password' => 'OldPassword1']);
        $staff = User::factory()->staff()->create();
        $admin = User::factory()->admin()->create();
        $payload = ['password' => 'NewPassword9', 'password_confirmation' => 'NewPassword9'];

        $this->actingAs($staff)->patchJson("/api/v1/admin/customers/{$customer->id}/password", $payload)->assertForbidden();
        $this->actingAs($admin)->patchJson("/api/v1/admin/customers/{$customer->id}/password", $payload)->assertOk();
        $this->assertTrue(Hash::check('NewPassword9', $customer->refresh()->password));
        $audit = AuditLog::where('action', 'customer.password_reset')->firstOrFail();
        $this->assertStringNotContainsString('NewPassword9', json_encode($audit->toArray()));
    }

    public function test_private_after_sales_media_requires_owner_admin_or_signed_guest_url(): void
    {
        Storage::fake('local');
        $owner = User::factory()->customer()->create();
        $other = User::factory()->customer()->create();
        $admin = User::factory()->admin()->create();
        $order = $this->order('MEDIA-001', $owner->id, '0903333333');
        $return = ReturnRequest::create([
            'code' => 'RET-MEDIA-001', 'order_id' => $order->id, 'user_id' => $owner->id,
            'request_type' => 'return', 'status' => 'requested', 'requested_at' => now(),
        ]);
        Storage::disk('local')->put('after-sales/returns/evidence.txt', 'private evidence');
        $medium = $return->media()->create([
            'path' => 'after-sales/returns/evidence.txt', 'disk' => 'local', 'mime_type' => 'text/plain',
            'original_name' => 'evidence.txt', 'sort_order' => 0,
        ]);

        $this->actingAs($owner)->get('/api/v1/account/after-sales-media/'.$medium->id)->assertOk();
        $this->actingAs($other)->get('/api/v1/account/after-sales-media/'.$medium->id)->assertNotFound();
        $this->actingAs($admin)->get('/api/v1/admin/after-sales-media/'.$medium->id)->assertOk();
        $this->get('/api/v1/guest/after-sales-media/'.$medium->id)->assertForbidden();
        $signed = URL::temporarySignedRoute('guest.after-sales-media.show', now()->addMinute(), ['medium' => $medium->id]);
        $this->get($signed)->assertOk();
    }

    public function test_production_database_seeder_only_creates_system_rbac_data(): void
    {
        app()->detectEnvironment(fn () => 'production');
        try {
            (new DatabaseSeeder)->setContainer(app())->run();
        } finally {
            app()->detectEnvironment(fn () => 'testing');
        }

        $this->assertDatabaseMissing('users', ['email' => 'admin@namhair.local']);
        $this->assertDatabaseMissing('users', ['email' => 'user@namhair.local']);
        $this->assertGreaterThan(0, Permission::count());
    }

    public function test_super_admin_command_uses_interactive_secret_and_creates_active_admin(): void
    {
        $this->artisan('users:create-super-admin')
            ->expectsQuestion('Password', 'SecurePass9')
            ->expectsQuestion('Name', 'Production Admin')
            ->expectsQuestion('Email', 'owner@example.com')
            ->expectsQuestion('Phone (optional)', '')
            ->expectsQuestion('Confirm Password', 'SecurePass9')
            ->expectsOutput('Super Admin created successfully.')
            ->assertSuccessful();

        $this->assertDatabaseHas('users', ['email' => 'owner@example.com', 'role' => 'admin', 'status' => 'active']);
    }

    private function order(string $number, ?int $userId, string $phone): Order
    {
        return Order::create([
            'order_number' => $number, 'user_id' => $userId, 'customer_name' => 'Khách hàng',
            'customer_email' => strtolower($number).'@example.com', 'customer_phone' => $phone,
            'province' => 'Hà Nội', 'district' => 'Ba Đình', 'ward' => 'Điện Biên',
            'shipping_address' => '1 Đường Mẫu', 'subtotal' => 100000, 'discount_amount' => 0,
            'shipping_fee' => 0, 'total_amount' => 100000, 'payment_method' => 'cod',
            'payment_status' => 'unpaid', 'order_status' => 'pending',
        ]);
    }

    private function assertJsonDoesNotContainKey(mixed $value, string $forbidden): void
    {
        if (! is_array($value)) {
            return;
        }
        $this->assertArrayNotHasKey($forbidden, $value);
        foreach ($value as $nested) {
            $this->assertJsonDoesNotContainKey($nested, $forbidden);
        }
    }
}
