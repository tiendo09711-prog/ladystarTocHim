<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\StaffRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseFourStaffManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_only_super_admin_can_manage_staff_and_active_staff_requires_role(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $customer = User::where('role', 'user')->firstOrFail();
        $staff = User::factory()->staff()->create();
        $this->actingAs($customer)->getJson('/api/v1/admin/staff')->assertForbidden();
        $this->actingAs($staff)->getJson('/api/v1/admin/staff')->assertForbidden();

        $this->actingAs($admin)->postJson('/api/v1/admin/staff', [
            'name' => 'Không role', 'email' => 'norole@example.test', 'password' => 'Password123',
            'password_confirmation' => 'Password123', 'status' => 'active', 'role_ids' => [],
        ])->assertUnprocessable();

        $sales = StaffRole::where('slug', 'sales')->firstOrFail();
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/staff', [
            'name' => 'Nhân viên mới', 'email' => 'newstaff@example.test', 'phone' => '0909000000',
            'password' => 'Password123', 'password_confirmation' => 'Password123', 'status' => 'active',
            'role_ids' => [$sales->id], 'role' => 'admin', 'is_super_admin' => true,
        ])->assertCreated()->assertJsonPath('data.role', 'staff')->assertJsonMissingPath('data.password');
        $staffId = $created->json('data.id');
        $this->assertDatabaseHas('users', ['id' => $staffId, 'role' => 'staff']);
        $this->actingAs($admin)->getJson('/api/v1/admin/staff')->assertOk()->assertJsonFragment(['newstaff@example.test']);
        $this->actingAs($admin)->deleteJson('/api/v1/admin/staff/'.$staffId)->assertMethodNotAllowed();
        $this->actingAs($admin)->patchJson('/api/v1/admin/staff/'.$admin->id.'/status', ['status' => 'blocked'])->assertNotFound();
    }

    public function test_role_assignment_block_and_password_reset_are_safe(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $staff = User::factory()->staff()->create(['password' => 'Oldpass123']);
        $sales = StaffRole::where('slug', 'sales')->firstOrFail();
        $warehouse = StaffRole::where('slug', 'warehouse')->firstOrFail();

        $this->actingAs($admin)->putJson('/api/v1/admin/staff/'.$staff->id.'/roles', ['role_ids' => [$sales->id, $warehouse->id]])
            ->assertOk()->assertJsonCount(2, 'data.staff_roles');
        $this->actingAs($admin)->putJson('/api/v1/admin/staff/'.$staff->id.'/roles', ['role_ids' => []])->assertUnprocessable();
        $this->actingAs($admin)->patchJson('/api/v1/admin/staff/'.$staff->id.'/status', ['status' => 'blocked'])->assertOk();
        $this->actingAs($staff)->getJson('/api/v1/admin/orders')->assertForbidden();
        $this->actingAs($admin)->putJson('/api/v1/admin/staff/'.$staff->id.'/roles', ['role_ids' => []])->assertOk();

        $this->actingAs($admin)->putJson('/api/v1/admin/staff/'.$staff->id.'/password', [
            'password' => 'Newpass123', 'password_confirmation' => 'Newpass123',
        ])->assertOk()->assertJsonMissing(['Newpass123']);
        $staff->update(['status' => 'active']);
        $staff->staffRoles()->attach($sales);
        $this->postJson('/api/v1/admin/auth/login', ['email' => $staff->email, 'password' => 'Newpass123'])->assertOk();
    }

    public function test_role_and_permission_management_prevents_privilege_escalation(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $customer = User::where('role', 'user')->firstOrFail();
        $staff = User::factory()->staff()->create();
        $permissionIds = Permission::whereIn('key', ['products.view', 'orders.view'])->pluck('id')->all();

        $this->actingAs($customer)->getJson('/api/v1/admin/permissions')->assertForbidden();
        $this->actingAs($staff)->getJson('/api/v1/admin/permissions')->assertForbidden();
        $this->actingAs($admin)->getJson('/api/v1/admin/permissions')->assertOk();
        $this->actingAs($admin)->postJson('/api/v1/admin/permissions', [])->assertMethodNotAllowed();

        $created = $this->actingAs($admin)->postJson('/api/v1/admin/staff-roles', [
            'name' => 'Tùy chỉnh', 'slug' => 'custom-role', 'description' => 'Kiểm thử', 'permission_ids' => $permissionIds,
        ])->assertCreated();
        $roleId = $created->json('data.id');
        $this->actingAs($admin)->postJson('/api/v1/admin/staff-roles', [
            'name' => 'Trùng', 'slug' => 'custom-role', 'permission_ids' => $permissionIds,
        ])->assertUnprocessable();
        $this->actingAs($admin)->putJson('/api/v1/admin/staff-roles/'.$roleId.'/permissions', ['permission_ids' => [$permissionIds[0]]])->assertOk();

        $role = StaffRole::findOrFail($roleId);
        $staff->staffRoles()->attach($role);
        $this->actingAs($admin)->deleteJson('/api/v1/admin/staff-roles/'.$roleId)->assertUnprocessable();
        $staff->staffRoles()->detach($role);
        $this->actingAs($admin)->deleteJson('/api/v1/admin/staff-roles/'.$roleId)->assertOk();
        $system = StaffRole::where('is_system', true)->firstOrFail();
        $this->actingAs($admin)->deleteJson('/api/v1/admin/staff-roles/'.$system->id)->assertUnprocessable();
    }
}
