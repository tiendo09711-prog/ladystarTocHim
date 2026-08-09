<?php

namespace Tests\Feature;

use App\Models\HomePageContent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomePageTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed();

        return User::where('role', 'admin')->firstOrFail();
    }

    public function test_public_home_page_returns_announcement_configuration(): void
    {
        $this->getJson('/api/v1/home-page')
            ->assertOk()
            ->assertJsonPath('data.announcement_enabled', true)
            ->assertJsonPath('data.announcement_interval_seconds', 5)
            ->assertJsonPath('data.announcement_messages.0', 'Miễn phí giao hàng cho đơn từ 1.000.000đ');
    }

    public function test_admin_can_update_announcement_configuration(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->putJson('/api/v1/admin/home-page', [
            'announcement_enabled' => true,
            'announcement_messages' => [' Thông báo đầu tiên ', 'Thông báo thứ hai'],
            'announcement_interval_seconds' => 7,
        ])->assertOk()
            ->assertJsonPath('data.announcement_messages.0', 'Thông báo đầu tiên')
            ->assertJsonPath('data.announcement_interval_seconds', 7);

        $this->assertDatabaseHas('home_page_contents', [
            'page_key' => 'home',
            'announcement_interval_seconds' => 7,
        ]);
        $this->assertSame(['Thông báo đầu tiên', 'Thông báo thứ hai'], HomePageContent::current()->announcement_messages);
    }

    public function test_home_page_admin_endpoints_require_admin(): void
    {
        $this->getJson('/api/v1/admin/home-page')->assertUnauthorized();
        $this->seed();
        $user = User::where('role', 'user')->firstOrFail();
        $this->actingAs($user)->getJson('/api/v1/admin/home-page')->assertForbidden();
    }
}
