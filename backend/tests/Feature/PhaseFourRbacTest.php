<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Permission;
use App\Models\StaffRole;
use App\Models\User;
use App\Support\PermissionRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class PhaseFourRbacTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_existing_super_admin_bypasses_permissions_and_customer_isolation_is_enforced(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $this->actingAs($admin)->getJson('/api/v1/admin/dashboard/summary')->assertOk();
        $this->actingAs($admin)->getJson('/api/v1/admin/products')->assertOk();
        $this->actingAs($admin)->getJson('/api/v1/account/profile')->assertForbidden();

        $staff = $this->staffWith(['customers.view']);
        $this->actingAs($staff)->getJson('/api/v1/account/profile')->assertForbidden();
        $this->actingAs($admin)->getJson('/api/v1/admin/customers/'.$staff->id)->assertNotFound();

        $customer = User::factory()->customer()->create();
        $this->actingAs($customer)->getJson('/api/v1/admin/products')->assertForbidden();
        $this->assertFalse($customer->hasPermission('products.view'));
    }

    public function test_staff_login_metadata_status_and_permission_changes_apply_immediately(): void
    {
        $role = $this->role(['products.view']);
        $staff = User::factory()->staff()->create(['email' => 'staff@example.test', 'password' => 'Password123']);
        $staff->staffRoles()->attach($role);

        $this->postJson('/api/v1/admin/auth/login', ['email' => $staff->email, 'password' => 'Password123'])
            ->assertOk()
            ->assertJsonPath('data.role', 'staff')
            ->assertJsonPath('data.is_super_admin', false)
            ->assertJsonFragment(['products.view']);
        $this->postJson('/api/v1/auth/login', ['email' => $staff->email, 'password' => 'Password123'])->assertForbidden();

        $this->actingAs($staff)->getJson('/api/v1/admin/products')->assertOk();
        $role->permissions()->sync([]);
        $this->actingAs($staff)->getJson('/api/v1/admin/products')->assertForbidden();

        $role->permissions()->sync(Permission::where('key', 'products.view')->pluck('id'));
        $staff->update(['status' => 'blocked']);
        $this->actingAs($staff)->getJson('/api/v1/admin/products')->assertForbidden();
        $this->postJson('/api/v1/admin/auth/login', ['email' => $staff->email, 'password' => 'Password123'])->assertForbidden();
    }

    public function test_staff_permissions_are_union_and_sensitive_mutations_are_denied(): void
    {
        $viewRole = $this->role(['products.view', 'orders.view', 'refunds.view']);
        $writeRole = $this->role(['orders.status.manage']);
        $staff = User::factory()->staff()->create();
        $staff->staffRoles()->attach([$viewRole->id, $writeRole->id]);

        $this->actingAs($staff)->getJson('/api/v1/admin/products')->assertOk();
        $this->actingAs($staff)->postJson('/api/v1/admin/products', [])->assertForbidden();
        $order = \App\Models\Order::where('order_number', 'NH-DEMO-001')->firstOrFail();
        $order->update(['order_status' => 'confirmed']);
        $orderId = $order->id;
        $this->actingAs($staff)->getJson('/api/v1/admin/orders/'.$orderId)->assertOk();
        $this->actingAs($staff)->patchJson('/api/v1/admin/orders/'.$orderId.'/status', ['order_status' => 'processing'])->assertOk();
        $this->actingAs($staff)->putJson('/api/v1/admin/settings', [])->assertForbidden();
        $payment = $order->payment()->create([
            'method' => 'manual', 'provider' => 'manual', 'amount' => $order->total_amount, 'status' => 'paid',
        ]);
        $refund = \App\Models\Refund::create([
            'code' => 'RF-RBAC-1', 'order_id' => $order->id, 'payment_id' => $payment->id,
            'amount' => 1000, 'status' => 'pending', 'method' => 'manual', 'requested_at' => now(),
        ]);
        $this->actingAs($staff)->postJson('/api/v1/admin/refunds/'.$refund->id.'/complete')->assertForbidden();
        $this->actingAs($staff)->postJson('/api/v1/admin/inventory/adjust', [])->assertForbidden();
        $this->actingAs($staff)->postJson('/api/v1/admin/appointment-schedules', [])->assertForbidden();
        $this->actingAs($staff)->getJson('/api/v1/admin/staff')->assertForbidden();
        $this->actingAs($staff)->getJson('/api/v1/admin/staff-roles')->assertForbidden();

        $writeRole->permissions()->sync([]);
        $this->actingAs($staff)->patchJson('/api/v1/admin/orders/'.$orderId.'/status', ['order_status' => 'processing'])->assertForbidden();
    }

    public function test_dynamic_export_requires_resource_specific_permission(): void
    {
        $staff = $this->staffWith(['export.products']);
        $this->actingAs($staff)->getJson('/api/v1/admin/export/products')->assertOk();
        $this->actingAs($staff)->getJson('/api/v1/admin/export/customers')->assertForbidden();
        $this->actingAs($staff)->getJson('/api/v1/admin/export/unknown')->assertNotFound();
    }

    public function test_all_admin_module_routes_have_security_middleware_and_permission_mapping(): void
    {
        foreach (Route::getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/v1/admin/')) continue;
            if (in_array($route->uri(), ['api/v1/admin/auth/login', 'api/v1/admin/auth/logout', 'api/v1/admin/auth/me'], true)) continue;

            $middleware = implode('|', $route->gatherMiddleware());
            $this->assertMatchesRegularExpression('/permission:|super_admin/', $middleware, $route->uri());
            $method = collect($route->methods())->first(fn (string $candidate) => $candidate !== 'HEAD') ?? 'GET';
            $path = preg_replace('/\{[^}]+\??\}/', '1', $route->uri());
            $request = Request::create('/'.$path, $method);
            $route->bind($request);
            $request->setRouteResolver(fn () => $route);
            $this->assertNotNull(PermissionRegistry::requiredFor($request), $route->uri());
        }
    }

    private function staffWith(array $keys): User
    {
        $staff = User::factory()->staff()->create();
        $staff->staffRoles()->attach($this->role($keys));

        return $staff;
    }

    private function role(array $keys): StaffRole
    {
        $role = StaffRole::create(['name' => 'Role '.uniqid(), 'slug' => 'role-'.uniqid(), 'is_system' => false]);
        $role->permissions()->sync(Permission::whereIn('key', $keys)->pluck('id'));

        return $role;
    }
}
