<?php

namespace Tests\Feature;

use App\Models\HomePageContent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
            ->assertJsonPath('data.announcement_messages.0', 'Miễn phí giao hàng cho đơn từ 1.000.000đ')
            ->assertJsonPath('data.sections.hero.title', 'Vẻ đẹp tự nhiên, được thiết kế riêng cho bạn.')
            ->assertJsonPath('data.sections.solutions.image_path', null)
            ->assertJsonPath('data.sections.styles.items.0.image_alt', 'Phong cách tự nhiên hằng ngày')
            ->assertJsonPath('data.sections.process.steps.0.image_alt', 'Bước lắng nghe nhu cầu')
            ->assertJsonPath('data.sections.testimonials.items.0.detail_title', 'Một lựa chọn rõ ràng và an tâm hơn')
            ->assertJsonPath('data.hero_image_path', null)
            ->assertJsonPath('data.brand_story_image_path', null);
    }

    public function test_admin_can_update_announcement_configuration(): void
    {
        $admin = $this->admin();
        $sections = HomePageContent::defaultSections();
        $sections['hero']['title'] = 'Hero đã cập nhật từ admin';

        $this->actingAs($admin)->putJson('/api/v1/admin/home-page', [
            'announcement_enabled' => true,
            'announcement_messages' => [' Thông báo đầu tiên ', 'Thông báo thứ hai'],
            'announcement_interval_seconds' => 7,
            'hero_image_alt' => 'Ảnh Hero LADYSTARS',
            'sections' => $sections,
        ])->assertOk()
            ->assertJsonPath('data.announcement_messages.0', 'Thông báo đầu tiên')
            ->assertJsonPath('data.announcement_interval_seconds', 7)
            ->assertJsonPath('data.sections.hero.title', 'Hero đã cập nhật từ admin');

        $this->assertDatabaseHas('home_page_contents', [
            'page_key' => 'home',
            'announcement_interval_seconds' => 7,
        ]);
        $this->assertSame(['Thông báo đầu tiên', 'Thông báo thứ hai'], HomePageContent::current()->announcement_messages);
        $this->assertSame('Hero đã cập nhật từ admin', HomePageContent::current()->sections['hero']['title']);
    }

    public function test_admin_can_upload_and_remove_home_page_section_images(): void
    {
        Storage::fake('public');
        $admin = $this->admin();

        $this->actingAs($admin)->post('/api/v1/admin/home-page/hero-image', [
            'image' => UploadedFile::fake()->image('hero.jpg', 1200, 900),
            'hero_image_alt' => 'Ảnh banner mới',
        ])->assertCreated()
            ->assertJsonPath('data.hero_image_alt', 'Ảnh banner mới');

        $content = HomePageContent::current()->fresh();
        Storage::disk('public')->assertExists($content->hero_image_path);
        $this->getJson('/api/v1/home-page')->assertOk()->assertJsonPath('data.hero_image_alt', 'Ảnh banner mới');

        $path = $content->hero_image_path;
        $this->actingAs($admin)->deleteJson('/api/v1/admin/home-page/hero-image')->assertOk()->assertJsonPath('data.hero_image_path', null);
        Storage::disk('public')->assertMissing($path);

        $this->actingAs($admin)->post('/api/v1/admin/home-page/brand-story-image', [
            'image' => UploadedFile::fake()->image('brand-story.jpg', 900, 900),
        ])->assertCreated()->assertJsonPath('data.brand_story_image_path', fn ($value) => is_string($value) && str_contains($value, '/storage/home-page/brand-story/'));

        $content = HomePageContent::current()->fresh();
        $storyPath = $content->brand_story_image_path;
        Storage::disk('public')->assertExists($storyPath);
        $this->getJson('/api/v1/home-page')->assertOk()->assertJsonPath('data.brand_story_image_path', fn ($value) => is_string($value) && str_contains($value, '/storage/home-page/brand-story/'));

        $this->actingAs($admin)->deleteJson('/api/v1/admin/home-page/brand-story-image')->assertOk()->assertJsonPath('data.brand_story_image_path', null);
        Storage::disk('public')->assertMissing($storyPath);

        $targets = [
            ['slot' => 'solutions', 'index' => null, 'json' => 'data.sections.solutions.image_path'],
            ['slot' => 'styles', 'index' => 0, 'json' => 'data.sections.styles.items.0.image_path'],
            ['slot' => 'process', 'index' => 0, 'json' => 'data.sections.process.steps.0.image_path'],
            ['slot' => 'testimonials', 'index' => 0, 'json' => 'data.sections.testimonials.items.0.image_path'],
        ];

        foreach ($targets as $target) {
            $suffix = $target['index'] === null ? '' : '/'.$target['index'];
            $url = "/api/v1/admin/home-page/section-images/{$target['slot']}{$suffix}";
            $this->actingAs($admin)->post($url, [
                'image' => UploadedFile::fake()->image("{$target['slot']}.jpg", 900, 700),
            ])->assertCreated()->assertJsonPath($target['json'], fn ($value) => is_string($value) && str_starts_with($value, "home-page/{$target['slot']}/"));

            $content = HomePageContent::current()->fresh()->normalizedSections();
            $path = match ($target['slot']) {
                'solutions' => $content['solutions']['image_path'],
                'styles' => $content['styles']['items'][0]['image_path'],
                'process' => $content['process']['steps'][0]['image_path'],
                'testimonials' => $content['testimonials']['items'][0]['image_path'],
            };
            Storage::disk('public')->assertExists($path);
            $this->getJson('/api/v1/home-page')->assertOk()->assertJsonPath($target['json'], $path);
            $this->actingAs($admin)->deleteJson($url)->assertOk()->assertJsonPath($target['json'], null);
            Storage::disk('public')->assertMissing($path);
        }
    }

    public function test_admin_cannot_save_unsafe_home_page_links(): void
    {
        $admin = $this->admin();
        $sections = HomePageContent::defaultSections();
        $sections['hero']['primary_url'] = 'javascript:alert(1)';

        $this->actingAs($admin)->putJson('/api/v1/admin/home-page', [
            'announcement_enabled' => true,
            'announcement_messages' => ['Thông báo'],
            'announcement_interval_seconds' => 5,
            'hero_image_alt' => null,
            'sections' => $sections,
        ])->assertUnprocessable()->assertJsonValidationErrors('sections.hero.primary_url');
    }

    public function test_home_page_admin_endpoints_require_admin(): void
    {
        $this->getJson('/api/v1/admin/home-page')->assertUnauthorized();
        $this->seed();
        $user = User::where('role', 'user')->firstOrFail();
        $this->actingAs($user)->getJson('/api/v1/admin/home-page')->assertForbidden();
    }
}
