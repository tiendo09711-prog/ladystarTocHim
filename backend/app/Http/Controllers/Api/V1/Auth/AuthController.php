<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\ApiResponse;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(private AuditLogService $audit) {}

    public function register(RegisterRequest $request)
    {
        $user = User::create(array_merge($request->validated(), ['role' => Role::User->value, 'status' => 'active']));
        Auth::guard('web')->login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return $this->success((new AuthenticatedUserResource($user))->resolve(), 'Đăng ký tài khoản thành công.', 201);
    }

    public function login(LoginRequest $request)
    {
        return $this->authenticate($request, false);
    }

    public function adminLogin(LoginRequest $request)
    {
        return $this->authenticate($request, true);
    }

    private function authenticate(LoginRequest $request, bool $admin)
    {
        if (! Auth::guard('web')->attempt($request->validated())) {
            return $this->error('Email hoặc mật khẩu không đúng.', ['email' => ['Thông tin đăng nhập không hợp lệ.']], 422);
        }
        $user = Auth::guard('web')->user();
        $allowed = $admin ? $user->canAccessAdmin() : ($user->status === 'active' && $user->isCustomer());
        if (! $allowed) {
            Auth::guard('web')->logout();

            return $this->error(
                $admin ? 'Tài khoản không có quyền quản trị.' : 'Tài khoản nhân viên vui lòng đăng nhập tại khu vực quản trị.',
                [],
                403,
            );
        }
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        if ($admin) {
            $this->audit->record('auth.backoffice_login', 'authentication', $user, null, ['status' => 'authenticated']);
        }

        return $this->success((new AuthenticatedUserResource($user))->resolve(), 'Đăng nhập thành công.');
    }

    public function me(Request $request)
    {
        return $this->success((new AuthenticatedUserResource($request->user()))->resolve());
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user?->canAccessAdmin()) {
            $this->audit->record('auth.backoffice_logout', 'authentication', $user);
        }
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $this->success(null, 'Đăng xuất thành công.');
    }

    public function forgotPassword(Request $request)
    {
        if (! config('features.password_reset_email')) {
            return $this->error('Để đặt lại mật khẩu, vui lòng liên hệ cửa hàng hoặc bộ phận hỗ trợ.', ['contact_url' => ['/lien-he']], 503);
        }
        $request->validate(['email' => ['required', 'email']]);
        Password::sendResetLink($request->only('email'));

        return $this->success(null, 'Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.');
    }

    public function resetPassword(Request $request)
    {
        if (! config('features.password_reset_email')) {
            return $this->error('Chức năng đặt lại mật khẩu qua email hiện chưa được bật.', [], 503);
        }
        $data = $request->validate(['token' => ['required'], 'email' => ['required', 'email'], 'password' => ['required', 'confirmed', 'min:8']]);
        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
            event(new PasswordReset($user));
        });

        return $status === Password::PASSWORD_RESET ? $this->success(null, 'Đặt lại mật khẩu thành công.') : $this->error('Không thể đặt lại mật khẩu.', ['email' => [__($status)]]);
    }
}
