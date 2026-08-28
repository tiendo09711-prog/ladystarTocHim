<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\StaffRole;
use App\Services\AuditLogService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StaffRoleManagementController extends Controller
{
    use ApiResponse;

    public function __construct(private AuditLogService $audit) {}

    public function index()
    {
        return $this->success(StaffRole::with('permissions:id,key,label,group_name')->withCount(['users', 'permissions'])->orderByDesc('is_system')->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $role = DB::transaction(function () use ($data) {
            $permissionIds = $data['permission_ids'];
            unset($data['permission_ids']);
            $role = StaffRole::create($data + ['is_system' => false]);
            $role->permissions()->sync($permissionIds);

            return $role;
        });
        $this->audit->record('staff_role.created', 'staff_roles', $role, null, $this->roleData($role));

        return $this->success($this->roleData($role), 'Tạo vai trò thành công.', 201);
    }

    public function show(StaffRole $staffRole)
    {
        return $this->success($this->roleData($staffRole));
    }

    public function update(Request $request, StaffRole $staffRole)
    {
        $before = $this->roleData($staffRole);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'slug' => ['required', 'alpha_dash', 'max:190', Rule::unique('staff_roles', 'slug')->ignore($staffRole)],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);
        $staffRole->update($data);
        $this->audit->record('staff_role.updated', 'staff_roles', $staffRole, $before, $this->roleData($staffRole));

        return $this->success($this->roleData($staffRole), 'Cập nhật vai trò thành công.');
    }

    public function permissions(Request $request, StaffRole $staffRole)
    {
        $data = $request->validate([
            'permission_ids' => ['required', 'array', 'min:1'],
            'permission_ids.*' => ['integer', 'distinct', 'exists:permissions,id'],
        ]);
        $before = $staffRole->permissions()->pluck('permissions.id')->all();
        DB::transaction(function () use ($staffRole, $data) {
            $locked = StaffRole::whereKey($staffRole->id)->lockForUpdate()->firstOrFail();
            Permission::whereIn('id', $data['permission_ids'])->lockForUpdate()->get();
            $locked->permissions()->sync($data['permission_ids']);
        });
        $staffRole->unsetRelation('permissions');
        $this->audit->record('staff_role.permissions_changed', 'staff_roles', $staffRole, ['permission_ids' => $before], ['permission_ids' => $data['permission_ids']]);

        return $this->success($this->roleData($staffRole), 'Cập nhật quyền thành công.');
    }

    public function destroy(StaffRole $staffRole)
    {
        if ($staffRole->is_system) {
            throw ValidationException::withMessages(['role' => 'Không thể xóa vai trò hệ thống.']);
        }
        if ($staffRole->users()->exists()) {
            throw ValidationException::withMessages(['role' => 'Không thể xóa vai trò đang được gán cho nhân viên.']);
        }
        $before = $this->roleData($staffRole);
        $staffRole->delete();
        $this->audit->record('staff_role.deleted', 'staff_roles', 'StaffRole', $before, null, ['staff_role_id' => $staffRole->id]);

        return $this->success(null, 'Đã xóa vai trò.');
    }

    public function catalog()
    {
        return $this->success(Permission::orderBy('group_name')->orderBy('key')->get());
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'slug' => ['required', 'alpha_dash', 'max:190', 'unique:staff_roles,slug'],
            'description' => ['nullable', 'string', 'max:2000'],
            'permission_ids' => ['required', 'array', 'min:1'],
            'permission_ids.*' => ['integer', 'distinct', 'exists:permissions,id'],
        ]);
    }

    private function roleData(StaffRole $role): array
    {
        $role->loadMissing('permissions:id,key,label,group_name');
        $role->loadCount(['users', 'permissions']);

        return [
            'id' => $role->id,
            'name' => $role->name,
            'slug' => $role->slug,
            'description' => $role->description,
            'is_system' => $role->is_system,
            'users_count' => $role->users_count,
            'permissions_count' => $role->permissions_count,
            'permissions' => $role->permissions,
            'created_at' => $role->created_at,
            'updated_at' => $role->updated_at,
        ];
    }
}
