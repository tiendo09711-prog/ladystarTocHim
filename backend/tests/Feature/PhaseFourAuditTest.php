<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Permission;
use App\Models\StaffRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseFourAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_security_actions_are_semantic_and_passwords_are_redacted(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $sales = StaffRole::where('slug', 'sales')->firstOrFail();
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/staff', [
            'name' => 'Audit Staff', 'email' => 'auditstaff@example.test', 'password' => 'Password123',
            'password_confirmation' => 'Password123', 'status' => 'active', 'role_ids' => [$sales->id],
        ])->assertCreated();
        $staffId = $created->json('data.id');
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.created', 'subject_id' => (string) $staffId]);

        $this->actingAs($admin)->putJson('/api/v1/admin/staff/'.$staffId.'/password', [
            'password' => 'Secret999', 'password_confirmation' => 'Secret999', 'token' => 'hidden-token',
        ])->assertOk();
        $log = AuditLog::where('action', 'staff.password_reset')->latest('id')->firstOrFail();
        $this->assertStringNotContainsString('Secret999', $log->toJson());
        $this->assertStringNotContainsString('hidden-token', $log->toJson());

        $this->actingAs($admin)->patchJson('/api/v1/admin/staff/'.$staffId.'/status', ['status' => 'blocked'])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.status_changed']);
    }

    public function test_domain_mutations_and_generic_fallback_are_audited_only_on_success(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $order = Order::where('order_number', 'NH-DEMO-001')->firstOrFail();
        $order->update(['order_status' => 'confirmed']);
        $this->actingAs($admin)->patchJson('/api/v1/admin/orders/'.$order->id.'/status', ['order_status' => 'processing'])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'order.status_changed', 'subject_id' => (string) $order->id]);

        $inventory = Inventory::firstOrFail();
        $this->actingAs($admin)->postJson('/api/v1/admin/inventory/adjust', [
            'branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id,
            'quantity' => 1, 'type' => 'adjustment', 'note' => 'Audit adjustment',
        ])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'inventory.adjusted']);

        $this->actingAs($admin)->postJson('/api/v1/admin/categories', [
            'name' => 'Audit category', 'slug' => 'audit-category', 'is_active' => true, 'sort_order' => 10,
        ])->assertCreated();
        $this->assertDatabaseHas('audit_logs', ['action' => 'category.created']);
        $before = AuditLog::count();
        $this->actingAs($admin)->postJson('/api/v1/admin/categories', [])->assertUnprocessable();
        $this->assertSame($before, AuditLog::count());
    }

    public function test_audit_is_read_only_and_requires_permission(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $this->actingAs($admin)->getJson('/api/v1/admin/audit-logs')->assertOk();
        $this->actingAs($admin)->postJson('/api/v1/admin/audit-logs', [])->assertMethodNotAllowed();
        $this->actingAs($admin)->deleteJson('/api/v1/admin/audit-logs/1')->assertMethodNotAllowed();

        $staff = User::factory()->staff()->create();
        $withoutAudit = StaffRole::create(['name' => 'No audit', 'slug' => 'no-audit']);
        $withoutAudit->permissions()->sync(Permission::where('key', 'products.view')->pluck('id'));
        $staff->staffRoles()->attach($withoutAudit);
        $this->actingAs($staff)->getJson('/api/v1/admin/audit-logs')->assertForbidden();

        $withoutAudit->permissions()->sync(Permission::whereIn('key', ['products.view', 'audit.view'])->pluck('id'));
        $this->actingAs($staff)->getJson('/api/v1/admin/audit-logs')->assertOk();
    }
}
