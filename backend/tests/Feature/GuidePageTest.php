<?php

namespace Tests\Feature;

use App\Models\NewsArticle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GuidePageTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::where('role', 'admin')->firstOrFail();
    }

    private function publishedGuide(string $slug = 'huong-dan-thu'): NewsArticle
    {
        return NewsArticle::create([
            'title' => 'Bài hướng dẫn thử',
            'slug' => $slug,
            'excerpt' => 'Tóm tắt hướng dẫn.',
            'content' => 'Nội dung hướng dẫn đầy đủ.',
            'category' => 'Hướng dẫn',
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    public function test_public_guide_page_only_returns_published_guides(): void
    {
        $this->seed();
        $guide = $this->publishedGuide();
        NewsArticle::create(['title' => 'Bản nháp', 'slug' => 'huong-dan-nhap', 'content' => 'Nội dung', 'category' => 'Hướng dẫn', 'status' => 'draft']);
        NewsArticle::create(['title' => 'Tin thường', 'slug' => 'tin-thuong-guide-test', 'content' => 'Nội dung', 'category' => 'Cẩm nang', 'status' => 'published', 'published_at' => now()]);

        $response = $this->getJson('/api/v1/guides-page')->assertOk();
        $this->assertSame($guide->slug, $response->json('data.featured.slug'));
        $this->assertNotContains('huong-dan-nhap', collect($response->json('data.articles.data'))->pluck('slug'));
        $this->getJson('/api/v1/guides/'.$guide->slug)->assertOk()->assertJsonPath('data.category', 'Hướng dẫn');
        $this->getJson('/api/v1/guides/tin-thuong-guide-test')->assertNotFound();
    }

    public function test_guides_do_not_leak_into_news_endpoints(): void
    {
        $this->seed();
        $guide = $this->publishedGuide();

        $this->assertNotContains($guide->slug, collect($this->getJson('/api/v1/news')->assertOk()->json('data.data'))->pluck('slug'));
        $this->getJson('/api/v1/news/'.$guide->slug)->assertNotFound();
    }

    public function test_admin_can_create_publish_and_delete_a_guide(): void
    {
        $this->seed();
        $admin = $this->admin();
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/guides', [
            'title' => 'Hướng dẫn quản trị',
            'slug' => 'huong-dan-quan-tri',
            'content' => 'Nội dung từ quản trị.',
            'category' => 'Không được dùng',
            'status' => 'published',
        ])->assertCreated()->assertJsonPath('data.category', 'Hướng dẫn');

        $id = $created->json('data.id');
        $this->getJson('/api/v1/guides/huong-dan-quan-tri')->assertOk();
        $this->actingAs($admin)->deleteJson('/api/v1/admin/guides/'.$id)->assertOk();
        $this->assertDatabaseMissing('news_articles', ['id' => $id]);
    }

    public function test_admin_can_manage_guide_page_and_hero_image(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = $this->admin();
        $guide = $this->publishedGuide('huong-dan-noi-bat');

        $this->actingAs($admin)->putJson('/api/v1/admin/guides-page', [
            'title' => 'Cẩm nang sử dụng',
            'description' => 'Nội dung giới thiệu được quản trị từ cơ sở dữ liệu.',
            'featured_article_id' => $guide->id,
            'hero_image_alt' => 'Không gian chăm sóc tóc',
            'seo' => ['title' => 'Cẩm nang LADYSTARS', 'description' => 'Mô tả SEO hướng dẫn.'],
        ])->assertOk()->assertJsonPath('data.content.title', 'Cẩm nang sử dụng');

        $upload = $this->actingAs($admin)->postJson('/api/v1/admin/guides-page/hero-image', [
            'image' => UploadedFile::fake()->image('hero.webp'),
            'hero_image_alt' => 'Ảnh nền hướng dẫn',
        ])->assertCreated();
        $this->assertNotNull($upload->json('data.content.hero_image_path'));
        $this->actingAs($admin)->deleteJson('/api/v1/admin/guides-page/hero-image')->assertOk()->assertJsonPath('data.content.hero_image_path', null);
    }

    public function test_admin_can_manage_guide_content_image_and_public_media_urls(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = $this->admin();
        $guide = $this->publishedGuide('huong-dan-media');

        $this->actingAs($admin)->putJson('/api/v1/admin/guides/'.$guide->id, [
            'title' => $guide->title,
            'slug' => $guide->slug,
            'content' => $guide->content,
            'status' => 'published',
            'content_image_alt' => 'Ảnh minh họa từng bước',
            'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'video_title' => 'Video hướng dẫn từng bước',
        ])->assertOk()
            ->assertJsonPath('data.video_url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
            ->assertJsonPath('data.video_title', 'Video hướng dẫn từng bước');

        $upload = $this->actingAs($admin)->postJson('/api/v1/admin/guides/'.$guide->id.'/content-image', [
            'image' => UploadedFile::fake()->image('content.webp', 1600, 900),
            'content_image_alt' => 'Ảnh nội dung đã crop',
        ])->assertCreated()->assertJsonPath('data.content_image_alt', 'Ảnh nội dung đã crop');

        $path = $upload->json('data.content_image_path');
        Storage::disk('public')->assertExists($path);

        $this->getJson('/api/v1/guides/'.$guide->slug)->assertOk()
            ->assertJsonPath('data.content_image_path', Storage::disk('public')->url($path))
            ->assertJsonPath('data.content_image_alt', 'Ảnh nội dung đã crop')
            ->assertJsonPath('data.video_url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
            ->assertJsonPath('data.video_title', 'Video hướng dẫn từng bước');

        $this->actingAs($admin)->deleteJson('/api/v1/admin/guides/'.$guide->id.'/content-image')
            ->assertOk()->assertJsonPath('data.content_image_path', null);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_admin_can_upload_replace_and_delete_guide_video(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = $this->admin();
        $guide = $this->publishedGuide('huong-dan-video');

        $firstUpload = $this->actingAs($admin)->postJson('/api/v1/admin/guides/'.$guide->id.'/video', [
            'video' => UploadedFile::fake()->create('guide.mp4', 1024, 'video/mp4'),
        ])->assertCreated();
        $firstPath = $firstUpload->json('data.video_path');
        Storage::disk('public')->assertExists($firstPath);

        $secondUpload = $this->actingAs($admin)->postJson('/api/v1/admin/guides/'.$guide->id.'/video', [
            'video' => UploadedFile::fake()->create('guide.webm', 1024, 'video/webm'),
        ])->assertCreated();
        $secondPath = $secondUpload->json('data.video_path');
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);

        $this->getJson('/api/v1/guides/'.$guide->slug)->assertOk()
            ->assertJsonPath('data.video_path', Storage::disk('public')->url($secondPath));

        $this->actingAs($admin)->deleteJson('/api/v1/admin/guides/'.$guide->id.'/video')
            ->assertOk()->assertJsonPath('data.video_path', null);
        Storage::disk('public')->assertMissing($secondPath);
    }

    public function test_guide_media_validation_rejects_invalid_files_and_urls(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = $this->admin();
        $guide = $this->publishedGuide('huong-dan-validation');

        $this->actingAs($admin)->postJson('/api/v1/admin/guides/'.$guide->id.'/content-image', [
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->actingAs($admin)->postJson('/api/v1/admin/guides/'.$guide->id.'/video', [
            'video' => UploadedFile::fake()->create('guide.mov', 100, 'video/quicktime'),
        ])->assertUnprocessable()->assertJsonValidationErrors('video');

        $this->actingAs($admin)->postJson('/api/v1/admin/guides/'.$guide->id.'/video', [
            'video' => UploadedFile::fake()->create('guide.mp4', 51201, 'video/mp4'),
        ])->assertUnprocessable()->assertJsonValidationErrors('video');

        $this->actingAs($admin)->putJson('/api/v1/admin/guides/'.$guide->id, [
            'title' => $guide->title,
            'slug' => $guide->slug,
            'content' => $guide->content,
            'status' => 'published',
            'video_url' => 'javascript:alert(1)',
        ])->assertUnprocessable()->assertJsonValidationErrors('video_url');
    }

    public function test_admin_can_manage_guide_page_cta_image(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = $this->admin();

        $upload = $this->actingAs($admin)->postJson('/api/v1/admin/guides-page/cta-image', [
            'image' => UploadedFile::fake()->image('cta.webp', 1200, 900),
            'cta_image_alt' => 'Ảnh tư vấn cuối trang',
        ])->assertCreated()
            ->assertJsonPath('data.content.cta_image_alt', 'Ảnh tư vấn cuối trang');

        $url = $upload->json('data.content.cta_image_path');
        $path = ltrim(str_replace('/storage/', '', parse_url($url, PHP_URL_PATH)), '/');
        Storage::disk('public')->assertExists($path);

        $this->getJson('/api/v1/guides-page')->assertOk()
            ->assertJsonPath('data.content.cta_image_path', $url)
            ->assertJsonPath('data.content.cta_image_alt', 'Ảnh tư vấn cuối trang');

        $this->actingAs($admin)->deleteJson('/api/v1/admin/guides-page/cta-image')
            ->assertOk()->assertJsonPath('data.content.cta_image_path', null);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_guide_admin_routes_require_admin(): void
    {
        $this->seed();
        $this->getJson('/api/v1/admin/guides')->assertUnauthorized();
        $user = User::where('role', 'user')->firstOrFail();
        $this->actingAs($user)->getJson('/api/v1/admin/guides')->assertForbidden();
    }
}
