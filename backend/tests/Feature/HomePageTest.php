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

    private function validSections(): array
    {
        $sections = HomePageContent::defaultSections();
        foreach ($sections as &$section) {
            foreach ($section as $key => $value) {
                if (is_string($value) && $value === '') $section[$key] = str_ends_with($key, '_url') ? '/' : 'Test';
            }
        }
        unset($section);
        $sections['hero']['trust_items'] = ['Test'];
        $sections['consultation']['options'] = ['Test'];
        $sections['brand_story']['values'] = [['title' => 'Test', 'description' => 'Test']];
        $sections['solutions']['bullets'] = ['Test'];
        $sections['styles']['items'] = [['title' => 'Test', 'description' => 'Test', 'url' => '/', 'image_alt' => 'Test']];
        $sections['process']['steps'] = [['number' => '1', 'title' => 'Test', 'description' => 'Test', 'image_alt' => 'Test']];
        $sections['testimonials']['items'] = [['quote' => 'Test', 'customer' => 'Test', 'label' => 'Test', 'detail_title' => 'Test', 'detail' => 'Test', 'image_alt' => 'Test']];
        $sections['contact']['cards'] = [['title' => 'Test', 'description' => 'Test', 'url' => '/']];
        $sections['insights']['items'] = [['title' => 'Test', 'description' => 'Test', 'url' => '/']];

        return $sections;
    }

    public function test_public_home_page_is_empty_when_not_configured(): void
    {
        $this->getJson('/api/v1/home-page')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_admin_can_update_announcement_configuration(): void
    {
        $admin = $this->admin();
        $sections = $this->validSections();
        $sections['hero']['title'] = 'Hero đã cập nhật từ admin';
        $sections['hero']['image_position_x'] = 36;
        $sections['hero']['image_position_y'] = 42;
        $sections['brand_story']['image_position_x'] = 47;
        $sections['brand_story']['image_position_y'] = 39;
        $sections['solutions']['image_position_x'] = 61;
        $sections['solutions']['image_position_y'] = 37;
        $sections['styles']['items'][0]['image_position_x'] = 58;
        $sections['styles']['items'][0]['image_position_y'] = 29;
        $sections['process']['steps'][0]['image_position_x'] = 55;
        $sections['process']['steps'][0]['image_position_y'] = 41;
        $sections['testimonials']['items'][0]['image_position_x'] = 46;
        $sections['testimonials']['items'][0]['image_position_y'] = 35;

        $this->actingAs($admin)->putJson('/api/v1/admin/home-page', [
            'announcement_enabled' => true,
            'announcement_messages' => [' Thông báo đầu tiên ', 'Thông báo thứ hai'],
            'announcement_interval_seconds' => 7,
            'hero_image_alt' => 'Ảnh Hero LADYSTARS',
            'sections' => $sections,
        ])->assertOk()
            ->assertJsonPath('data.announcement_messages.0', 'Thông báo đầu tiên')
            ->assertJsonPath('data.announcement_interval_seconds', 7)
            ->assertJsonPath('data.sections.hero.title', 'Hero đã cập nhật từ admin')
            ->assertJsonPath('data.sections.hero.image_position_x', 36)
            ->assertJsonPath('data.sections.hero.image_position_y', 42)
            ->assertJsonPath('data.sections.brand_story.image_position_x', 47)
            ->assertJsonPath('data.sections.solutions.image_position_y', 37)
            ->assertJsonPath('data.sections.styles.items.0.image_position_x', 58)
            ->assertJsonPath('data.sections.process.steps.0.image_position_y', 41)
            ->assertJsonPath('data.sections.testimonials.items.0.image_position_x', 46);

        $this->assertDatabaseHas('home_page_contents', [
            'page_key' => 'home',
            'announcement_interval_seconds' => 7,
        ]);
        $this->assertSame(['Thông báo đầu tiên', 'Thông báo thứ hai'], HomePageContent::current()->announcement_messages);
        $this->assertSame('Hero đã cập nhật từ admin', HomePageContent::current()->sections['hero']['title']);
        $this->assertSame(36, HomePageContent::current()->sections['hero']['image_position_x']);
        $this->assertSame(42, HomePageContent::current()->sections['hero']['image_position_y']);
        $this->assertSame(58, HomePageContent::current()->sections['styles']['items'][0]['image_position_x']);
        $this->assertSame(35, HomePageContent::current()->sections['testimonials']['items'][0]['image_position_y']);
    }

    public function test_admin_can_upload_and_remove_home_page_section_images(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        HomePageContent::current()->update(['sections' => $this->validSections()]);

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
        $sections = $this->validSections();
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
