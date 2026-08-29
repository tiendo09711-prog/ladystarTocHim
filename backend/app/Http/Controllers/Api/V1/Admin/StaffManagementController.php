<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\StaffRole;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\ApiResponse;
use App\Support\PhoneNormalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class StaffManagementController extends Controller
{
    use ApiResponse;

    public function __construct(private AuditLogService $audit) {}

    public function index(Request $request)
    {
        $query = User::where('role', 'staff')->with('staffRoles:id,name,slug')->latest();
        $query->when($request->filled('search'), fn ($builder) => $builder->where(function ($search) use ($request) {
            $value = '%'.$request->string('search').'%';
            $search->where('name', 'like', $value)->orWhere('email', 'like', $value)->orWhere('phone', 'like', $value);
        }));
        $query->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')));
        $query->when($request->filled('role'), fn ($builder) => $builder->whereHas('staffRoles', fn ($roles) => $roles->where('slug', $request->string('role'))));

        $rows = $query->paginate(20);
        $rows->setCollection($rows->getCollection()->map(fn (User $staff) => $this->staffData($staff)));

        return $this->success($rows);
    }

    public function store(Request $request)
    {
        $request->merge(['phone' => PhoneNormalizer::normalize($request->input('phone'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30', 'unique:users,phone'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'status' => ['required', Rule::in(['active', 'blocked'])],
            'role_ids' => ['required_if:status,active', 'array'],
            'role_ids.*' => ['integer', 'distinct', 'exists:staff_roles,id'],
        ]);

        $staff = DB::transaction(function () use ($data) {
            $roleIds = $data['role_ids'] ?? [];
            unset($data['role_ids']);
            $staff = User::create($data + ['role' => 'staff']);
            $staff->staffRoles()->sync($roleIds);

            return $staff;
        });

        $this->audit->record('staff.created', 'staff', $staff, null, $this->staffData($staff), ['role_ids' => $staff->staffRoles()->pluck('staff_roles.id')->all()]);

        return $this->success($this->staffData($staff), 'Tạo nhân viên thành công.', 201);
    }

    public function show(User $staff)
    {
        $this->assertStaff($staff);

        return $this->success($this->staffData($staff));
    }

    public function update(Request $request, User $staff)
    {
        $request->merge(['phone' => PhoneNormalizer::normalize($request->input('phone'))]);
        $this->assertStaff($staff);
        $before = $this->staffData($staff);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($staff)],
            'phone' => ['nullable', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($staff)],
        ]);
        $staff->update($data);
        $this->audit->record('staff.updated', 'staff', $staff, $before, $this->staffData($staff));

        return $this->success($this->staffData($staff), 'Cập nhật nhân viên thành công.');
    }

    public function status(Request $request, User $staff)
    {
        $this->assertStaff($staff);
        $status = $request->validate(['status' => ['required', Rule::in(['active', 'blocked'])]])['status'];
        if ($status === 'active' && ! $staff->staffRoles()->exists()) {
            throw ValidationException::withMessages(['status' => 'Nhân viên hoạt động phải có ít nhất một vai trò.']);
        }
        $before = ['status' => $staff->status];
        $staff->update(['status' => $status]);
        if ($status === 'blocked' && config('session.driver') === 'database' && Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $staff->id)->delete();
        }
        $this->audit->record('staff.status_changed', 'staff', $staff, $before, ['status' => $status]);

        return $this->success($this->staffData($staff), $status === 'active' ? 'Đã mở khóa nhân viên.' : 'Đã khóa nhân viên.');
    }

    public function roles(Request $request, User $staff)
    {
        $this->assertStaff($staff);
        $data = $request->validate(['role_ids' => ['array'], 'role_ids.*' => ['integer', 'distinct', 'exists:staff_roles,id']]);
        $roleIds = $data['role_ids'] ?? [];
        if ($staff->status === 'active' && $roleIds === []) {
            throw ValidationException::withMessages(['role_ids' => 'Nhân viên hoạt động phải có ít nhất một vai trò.']);
        }

        $before = $staff->staffRoles()->pluck('staff_roles.id')->all();
        DB::transaction(function () use ($staff, $roleIds) {
            $locked = User::whereKey($staff->id)->where('role', 'staff')->lockForUpdate()->firstOrFail();
            StaffRole::whereIn('id', $roleIds)->lockForUpdate()->get();
            $locked->staffRoles()->sync($roleIds);
        });
        $staff->unsetRelation('staffRoles');
        $this->audit->record('staff.roles_changed', 'staff', $staff, ['role_ids' => $before], ['role_ids' => $roleIds]);

        return $this->success($this->staffData($staff), 'Cập nhật vai trò thành công.');
    }

    public function password(Request $request, User $staff)
    {
        $this->assertStaff($staff);
        $data = $request->validate(['password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()]]);
        $staff->update(['password' => $data['password']]);
        if (config('session.driver') === 'database' && Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $staff->id)->delete();
        }
        $this->audit->record('staff.password_reset', 'staff', $staff, null, null, ['sessions_revoked' => config('session.driver') === 'database']);

        return $this->success(null, 'Đặt lại mật khẩu nhân viên thành công.');
    }

    private function assertStaff(User $staff): void
    {
        abort_unless($staff->isStaff(), 404);
    }

    private function staffData(User $staff): array
    {
        $staff->loadMissing('staffRoles:id,name,slug');

        return [
            'id' => $staff->id,
            'name' => $staff->name,
            'email' => $staff->email,
            'phone' => $staff->phone,
            'role' => $staff->role,
            'status' => $staff->status,
            'staff_roles' => $staff->staffRoles->map->only(['id', 'name', 'slug'])->values(),
            'permissions' => $staff->effectivePermissionKeys(),
            'created_at' => $staff->created_at,
            'updated_at' => $staff->updated_at,
        ];
    }
}
