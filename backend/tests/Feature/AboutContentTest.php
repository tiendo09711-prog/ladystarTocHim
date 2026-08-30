<?php

namespace Tests\Feature;

use App\Models\AboutSection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AboutContentTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::where('role', 'admin')->firstOrFail();
    }

    public function test_public_about_returns_active_sections_sorted(): void
    {
        $this->seed();
        AboutSection::where('section_key', 'testimonials')->update(['is_active' => false]);

        $response = $this->getJson('/api/v1/about')->assertOk();
        $sections = $response->json('data.sections');
        $this->assertCount(9, $sections);
        $this->assertEquals('hero', $sections[0]['section_key']);
        $this->assertEquals('final-cta', $sections[8]['section_key']);
        $this->assertEquals('Câu chuyện thương hiệu | LADYSTARS', $response->json('data.seo.title'));
        $this->assertArrayNotHasKey('is_active', $sections[0]);
    }

    public function test_public_about_is_empty_when_database_is_empty(): void
    {
        $this->getJson('/api/v1/about')
            ->assertOk()
            ->assertJsonPath('data.sections', [])
            ->assertJsonPath('data.seo', null);
    }

    public function test_admin_can_update_section_and_reorder(): void
    {
        $this->seed();
        $admin = $this->admin();
        $section = AboutSection::where('section_key', 'commitments')->firstOrFail();

        $this->actingAs($admin)->getJson('/api/v1/admin/about/sections')
            ->assertOk()
            ->assertJsonPath('data.0.settings.image_badge', 'Hair system · Toupee · Personal styling')
            ->assertJsonMissingPath('data.0.settings_json');

        $this->actingAs($admin)->putJson('/api/v1/admin/about/sections/'.$section->id, [
            'title' => 'Cam kết đã chỉnh sửa',
            'settings' => ['items' => [['icon' => 'heart', 'title' => 'Mới', 'description' => 'Mô tả mới.']]],
        ])->assertOk()->assertJsonPath('data.title', 'Cam kết đã chỉnh sửa');
        $this->assertDatabaseHas('about_sections', ['id' => $section->id, 'title' => 'Cam kết đã chỉnh sửa']);

        $ids = AboutSection::orderByDesc('sort_order')->pluck('id')->all();
        $this->actingAs($admin)->patchJson('/api/v1/admin/about/reorder', ['order' => $ids])->assertOk();
        $this->assertEquals($ids[0], AboutSection::orderBy('sort_order')->value('id'));
    }

    public function test_admin_rejects_invalid_settings_and_cta_url(): void
    {
        $this->seed();
        $section = AboutSection::firstOrFail();
        $this->actingAs($this->admin())->putJson('/api/v1/admin/about/sections/'.$section->id, [
            'cta_url' => 'javascript:alert(1)',
            'settings' => ['items' => [['icon' => 'not-allowed-icon', 'title' => 'X']]],
        ])->assertUnprocessable();
    }

    public function test_admin_can_upload_and_delete_section_image(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = $this->admin();
        $section = AboutSection::where('section_key', 'hero')->firstOrFail();

        $this->actingAs($admin)->postJson('/api/v1/admin/about/sections/'.$section->id.'/image', [
            'image' => UploadedFile::fake()->image('hero.jpg', 800, 600),
        ])->assertCreated();
        $path = $section->fresh()->image_path;
        $this->assertStringStartsWith('about/hero/', $path);
        Storage::disk('public')->assertExists($path);

        $this->actingAs($admin)->deleteJson('/api/v1/admin/about/sections/'.$section->id.'/image')->assertOk();
        $this->assertNull($section->fresh()->image_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_admin_rejects_invalid_image_upload(): void
    {
        Storage::fake('public');
        $this->seed();
        $section = AboutSection::firstOrFail();
        $this->actingAs($this->admin())->postJson('/api/v1/admin/about/sections/'.$section->id.'/image', [
            'image' => UploadedFile::fake()->create('shell.php', 10, 'application/x-php'),
        ])->assertUnprocessable();
    }

    public function test_admin_endpoints_require_admin(): void
    {
        $this->seed();
        $this->getJson('/api/v1/admin/about/sections')->assertUnauthorized();
        $user = User::where('role', 'user')->firstOrFail();
        $this->actingAs($user)->getJson('/api/v1/admin/about/sections')->assertForbidden();
    }

    public function test_admin_can_update_page_seo(): void
    {
        $this->seed();
        $this->actingAs($this->admin())->putJson('/api/v1/admin/about/seos/gioi-thieu', [
            'title' => 'Giới thiệu LADYSTARS',
            'description' => 'Mô tả mới.',
        ])->assertOk();
        $this->getJson('/api/v1/seo/gioi-thieu')->assertOk()->assertJsonPath('data.title', 'Giới thiệu LADYSTARS');
        $this->getJson('/api/v1/seo/khong-ton-tai')->assertNotFound();
    }
}
