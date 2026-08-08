<?php

namespace Tests\Feature;

use App\Models\NewsArticle;
use App\Models\NewsPageContent;
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

    // ===== News Page Content tests =====

    private function createPublished(?string $slug = null, ?string $cover = null): NewsArticle
    {
        return NewsArticle::create([
            'title' => 'Bài '.$slug ?? 'test',
            'slug' => $slug ?? 'bai-test-'.uniqid(),
            'excerpt' => 'Tóm tắt.',
            'content' => 'Nội dung đầy đủ.',
            'status' => 'published',
            'published_at' => now(),
            'cover_image_path' => $cover,
        ]);
    }

    public function test_news_page_returns_content_featured_and_pagination(): void
    {
        $this->seed();
        $article = $this->createPublished('bai-noi-bat', '/images/cover.svg');
        NewsPageContent::updateOrCreate(['page_key' => 'news'], ['featured_article_id' => $article->id]);

        $response = $this->getJson('/api/v1/news-page')->assertOk();
        $response->assertJsonStructure(['data' => ['content', 'seo', 'featured', 'articles']]);
        $this->assertEquals('bai-noi-bat', $response->json('data.featured.slug'));
        $gridSlugs = collect($response->json('data.articles.data'))->pluck('slug');
        $this->assertNotContains('bai-noi-bat', $gridSlugs);
    }

    public function test_news_page_only_shows_published(): void
    {
        $this->seed();
        $pub1 = $this->createPublished('bai-cong-khai');
        $pub2 = $this->createPublished('bai-cong-khai-2', '/images/x.svg');
        NewsArticle::create(['title' => 'Nháp', 'slug' => 'bai-nhap', 'content' => 'x', 'status' => 'draft']);
        NewsArticle::create(['title' => 'Lưu trữ', 'slug' => 'bai-luu-tru', 'content' => 'x', 'status' => 'archived', 'published_at' => now()]);

        $response = $this->getJson('/api/v1/news-page')->assertOk();
        $slugs = collect($response->json('data.articles.data'))->pluck('slug')
            ->merge([$response->json('data.featured.slug')]);
        $this->assertContains('bai-cong-khai', $slugs);
        $this->assertContains('bai-cong-khai-2', $slugs);
        $this->assertNotContains('bai-nhap', $slugs);
        $this->assertNotContains('bai-luu-tru', $slugs);
    }

    public function test_news_page_excludes_future_published(): void
    {
        $this->seed();
        $this->createPublished('bai-hien-tai');
        NewsArticle::create(['title' => 'Tương lai', 'slug' => 'bai-tuong-lai', 'content' => 'x', 'status' => 'published', 'published_at' => now()->addDays(3)]);

        $response = $this->getJson('/api/v1/news-page')->assertOk();
        $slugs = collect($response->json('data.articles.data'))->pluck('slug');
        $this->assertNotContains('bai-tuong-lai', $slugs);
    }

    public function test_news_page_grid_max_nine(): void
    {
        $this->seed();
        for ($i = 0; $i < 12; $i++) {
            $this->createPublished('bai-'.$i);
        }
        $response = $this->getJson('/api/v1/news-page')->assertOk();
        $this->assertCount(9, $response->json('data.articles.data'));
        $this->assertEquals(2, $response->json('data.articles.last_page'));
    }

    public function test_news_page_fallback_featured_when_unconfigured(): void
    {
        $this->seed();
        $this->createPublished('bai-co-anh', '/images/a.svg');
        $response = $this->getJson('/api/v1/news-page')->assertOk();
        $this->assertNotNull($response->json('data.featured'));
    }

    public function test_news_page_fallback_prefers_cover(): void
    {
        $this->seed();
        $withoutCover = NewsArticle::create(['title' => 'Không ảnh', 'slug' => 'khong-anh', 'content' => 'x', 'status' => 'published', 'published_at' => now()->subHour()]);
        $withCover = NewsArticle::create(['title' => 'Có ảnh', 'slug' => 'co-anh', 'content' => 'x', 'status' => 'published', 'published_at' => now(), 'cover_image_path' => '/images/b.svg']);
        $response = $this->getJson('/api/v1/news-page')->assertOk();
        $this->assertEquals('co-anh', $response->json('data.featured.slug'));
    }

    public function test_admin_can_update_news_page_content(): void
    {
        $this->seed();
        $admin = $this->admin();
        $this->actingAs($admin)->putJson('/api/v1/admin/news-page', [
            'eyebrow' => 'Tin mới',
            'title' => 'Tiêu đề mới',
            'description' => 'Mô tả mới',
            'seo' => ['title' => 'SEO mới', 'description' => 'Desc'],
        ])->assertOk()->assertJsonPath('data.content.title', 'Tiêu đề mới');
        $this->assertDatabaseHas('news_page_contents', ['page_key' => 'news', 'title' => 'Tiêu đề mới']);
        $this->assertDatabaseHas('page_seos', ['page_key' => 'tin-tuc', 'title' => 'SEO mới']);
    }

    public function test_news_page_admin_requires_admin(): void
    {
        $this->seed();
        $this->getJson('/api/v1/admin/news-page')->assertUnauthorized();
        $user = User::where('role', 'user')->firstOrFail();
        $this->actingAs($user)->getJson('/api/v1/admin/news-page')->assertForbidden();
        $this->actingAs($user)->putJson('/api/v1/admin/news-page', [])->assertForbidden();
    }

    public function test_admin_cannot_select_draft_as_featured(): void
    {
        $this->seed();
        $admin = $this->admin();
        $draft = NewsArticle::create(['title' => 'Nháp', 'slug' => 'nhap', 'content' => 'x', 'status' => 'draft']);
        $this->actingAs($admin)->putJson('/api/v1/admin/news-page', [
            'featured_article_id' => $draft->id,
        ])->assertUnprocessable();
    }

    public function test_cta_image_upload_and_delete(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/v1/admin/news-page/cta-image', [
            'image' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf'),
        ])->assertUnprocessable();

        $this->actingAs($admin)->postJson('/api/v1/admin/news-page/cta-image', [
            'image' => UploadedFile::fake()->image('cta.webp'),
            'cta_image_alt' => 'Ảnh CTA',
        ])->assertCreated();
        $content = NewsPageContent::where('page_key', 'news')->first();
        Storage::disk('public')->assertExists($content->cta_image_path);
        $this->assertEquals('Ảnh CTA', $content->cta_image_alt);

        $oldPath = $content->cta_image_path;
        $this->actingAs($admin)->postJson('/api/v1/admin/news-page/cta-image', [
            'image' => UploadedFile::fake()->image('cta2.png'),
        ])->assertCreated();
        Storage::disk('public')->assertMissing($oldPath);

        $this->actingAs($admin)->deleteJson('/api/v1/admin/news-page/cta-image')->assertOk();
        $this->assertNull(NewsPageContent::where('page_key', 'news')->value('cta_image_path'));
    }

    public function test_deleting_featured_article_clears_fk(): void
    {
        $this->seed();
        $article = $this->createPublished('bai-fk', '/images/c.svg');
        NewsPageContent::updateOrCreate(['page_key' => 'news'], ['featured_article_id' => $article->id]);
        $article->delete();
        $this->assertNull(NewsPageContent::where('page_key', 'news')->value('featured_article_id'));
    }

    public function test_unpublish_featured_does_not_break_public(): void
    {
        $this->seed();
        $article = $this->createPublished('bai-unpub', '/images/d.svg');
        $other = $this->createPublished('bai-other', '/images/e.svg');
        NewsPageContent::updateOrCreate(['page_key' => 'news'], ['featured_article_id' => $article->id]);
        $article->update(['status' => 'draft']);
        $response = $this->getJson('/api/v1/news-page')->assertOk();
        $this->assertNotNull($response->json('data.featured'));
        $this->assertEquals('bai-other', $response->json('data.featured.slug'));
    }

    public function test_news_page_rejects_javascript_cta_url(): void
    {
        $this->seed();
        $admin = $this->admin();
        $this->actingAs($admin)->putJson('/api/v1/admin/news-page', [
            'cta_primary_url' => 'javascript:alert(1)',
        ])->assertUnprocessable();
    }
}
