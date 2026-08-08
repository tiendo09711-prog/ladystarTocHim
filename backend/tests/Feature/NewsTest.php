<?php

namespace Tests\Feature;

use App\Models\NewsArticle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class NewsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::where('role', 'admin')->firstOrFail();
    }

    private function createPublishedArticle(): NewsArticle
    {
        return NewsArticle::create([
            'title' => 'Bài viết đã xuất bản',
            'slug' => 'bai-viet-da-xuat-ban',
            'excerpt' => 'Tóm tắt ngắn.',
            'content' => 'Nội dung đầy đủ của bài viết.',
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    public function test_public_news_list_only_shows_published(): void
    {
        $this->seed();
        $this->createPublishedArticle();

        $response = $this->getJson('/api/v1/news')->assertOk();
        $slugs = collect($response->json('data.data'))->pluck('slug');
        $this->assertContains('bai-viet-da-xuat-ban', $slugs);
        $this->assertNotContains('chao-mung-den-voi-ladystars', $slugs);
    }

    public function test_public_news_detail_hides_draft_and_archived(): void
    {
        $this->seed();
        $this->createPublishedArticle();

        $this->getJson('/api/v1/news/bai-viet-da-xuat-ban')->assertOk()->assertJsonPath('data.slug', 'bai-viet-da-xuat-ban');
        $this->getJson('/api/v1/news/chao-mung-den-voi-ladystars')->assertNotFound();
    }

    public function test_admin_can_create_draft_publish_and_archive(): void
    {
        $this->seed();
        $admin = $this->admin();

        $created = $this->actingAs($admin)->postJson('/api/v1/admin/news', [
            'title' => 'Bản tin thử nghiệm',
            'slug' => 'ban-tin-thu-nghiem',
            'content' => 'Nội dung bản tin.',
            'status' => 'draft',
        ])->assertCreated();
        $id = $created->json('data.id');
        $this->assertDatabaseHas('news_articles', ['id' => $id, 'status' => 'draft']);

        $this->actingAs($admin)->patchJson('/api/v1/admin/news/'.$id.'/status', ['status' => 'published'])->assertOk();
        $article = NewsArticle::findOrFail($id);
        $this->assertEquals('published', $article->status);
        $this->assertNotNull($article->published_at);

        $this->actingAs($admin)->patchJson('/api/v1/admin/news/'.$id.'/status', ['status' => 'archived'])->assertOk();
        $this->getJson('/api/v1/news/ban-tin-thu-nghiem')->assertNotFound();
    }

    public function test_admin_cannot_publish_article_without_content(): void
    {
        $this->seed();
        $admin = $this->admin();
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/news', [
            'title' => 'Bản tin rỗng',
            'slug' => 'ban-tin-rong',
            'status' => 'draft',
        ])->assertCreated();

        $this->actingAs($admin)->patchJson('/api/v1/admin/news/'.$created->json('data.id').'/status', ['status' => 'published'])->assertUnprocessable();
    }

    public function test_admin_rejects_duplicate_or_invalid_slug(): void
    {
        $this->seed();
        $admin = $this->admin();
        $this->createPublishedArticle();

        $this->actingAs($admin)->postJson('/api/v1/admin/news', [
            'title' => 'Trùng slug',
            'slug' => 'bai-viet-da-xuat-ban',
            'content' => 'Nội dung.',
        ])->assertUnprocessable();

        $this->actingAs($admin)->postJson('/api/v1/admin/news', [
            'title' => 'Slug xấu',
            'slug' => 'Slug Khong Hop Le!',
            'content' => 'Nội dung.',
        ])->assertUnprocessable();
    }

    public function test_admin_cover_image_validation_and_upload(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = $this->admin();
        $article = $this->createPublishedArticle();

        $this->actingAs($admin)->postJson('/api/v1/admin/news/'.$article->id.'/cover-image', [
            'image' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf'),
        ])->assertUnprocessable();

        $this->actingAs($admin)->postJson('/api/v1/admin/news/'.$article->id.'/cover-image', [
            'image' => UploadedFile::fake()->image('cover.webp'),
        ])->assertCreated();
        $path = $article->fresh()->cover_image_path;
        Storage::disk('public')->assertExists($path);

        $this->actingAs($admin)->deleteJson('/api/v1/admin/news/'.$article->id.'/cover-image')->assertOk();
        Storage::disk('public')->assertMissing($path);
    }

    public function test_content_is_stripped_of_html(): void
    {
        $this->seed();
        $admin = $this->admin();
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/news', [
            'title' => 'Bài có HTML',
            'slug' => 'bai-co-html',
            'content' => '<script>alert(1)</script><b>Xin chào</b>',
        ])->assertCreated();
        $this->assertStringNotContainsString('<script>', $created->json('data.content'));
        $this->assertStringContainsString('Xin chào', $created->json('data.content'));
    }

    public function test_admin_endpoints_require_admin(): void
    {
        $this->seed();
        $this->getJson('/api/v1/admin/news')->assertUnauthorized();
        $user = User::where('role', 'user')->firstOrFail();
        $this->actingAs($user)->getJson('/api/v1/admin/news')->assertForbidden();
    }
}
