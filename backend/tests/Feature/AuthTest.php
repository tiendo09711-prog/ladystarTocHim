<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_read_profile(): void
    {
        $response = $this->withHeaders(['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/dang-ky'])->postJson('/api/v1/auth/register', [
            'name' => 'Nguyễn Văn Nam', 'email' => 'nam@example.com', 'phone' => '0912345678',
            'password' => 'Password123', 'password_confirmation' => 'Password123',
        ]);
        $response->assertCreated()->assertJsonPath('success', true)->assertJsonPath('data.role', 'user');
        $this->assertAuthenticated();
        $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.email', 'nam@example.com');
    }

    public function test_admin_login_rejects_normal_user(): void
    {
        User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'Password123', 'role' => 'user', 'status' => 'active']);
        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/v1/admin/auth/login', ['email' => 'user@example.com', 'password' => 'Password123'])
            ->assertForbidden()->assertJsonPath('success', false);
    }

    public function test_user_cannot_call_admin_api(): void
    {
        $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'Password123', 'role' => 'user', 'status' => 'active']);
        $this->actingAs($user)->getJson('/api/v1/admin/dashboard/summary')->assertForbidden();
    }
}
