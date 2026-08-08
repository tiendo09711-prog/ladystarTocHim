<?php

namespace Tests\Feature;

use App\Models\NewsArticle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PromotionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_promotions_page_only_returns_published_promotions(): void
    {
        $this->seed();
        NewsArticle::create(['title' => 'Ưu đãi mới', 'slug' => 'uu-dai-moi', 'content' => 'Nội dung', 'category' => 'Ưu đãi', 'status' => 'published', 'published_at' => now()]);
        NewsArticle::create(['title' => 'Tin thường', 'slug' => 'tin-thuong', 'content' => 'Nội dung', 'category' => 'Cẩm nang', 'status' => 'published', 'published_at' => now()]);
        NewsArticle::create(['title' => 'Ưu đãi nháp', 'slug' => 'uu-dai-nhap', 'content' => 'Nội dung', 'category' => 'Ưu đãi', 'status' => 'draft']);

        $response = $this->getJson('/api/v1/promotions-page')->assertOk();
        $this->assertSame('Ưu đãi mới', $response->json('data.featured.title'));
        $slugs = collect($response->json('data.articles.data'))->pluck('slug');
        $this->assertNotContains('tin-thuong', $slugs);
        $this->assertNotContains('uu-dai-nhap', $slugs);
    }

    public function test_admin_can_manage_promotion_and_filter_promotion_list(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/promotions', [
            'title' => 'Đặc quyền tháng mới',
            'slug' => 'dac-quyen-thang-moi',
            'content' => 'Nội dung ưu đãi.',
            'category' => 'Ưu đãi',
            'status' => 'published',
        ])->assertCreated();

        $this->actingAs($admin)->getJson('/api/v1/admin/promotions?category='.urlencode('Ưu đãi'))
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $created->json('data.id'));
    }

    public function test_admin_can_update_promotion_page_content_and_cta_image(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $promotion = NewsArticle::create(['title' => 'Ưu đãi nổi bật', 'slug' => 'uu-dai-noi-bat', 'content' => 'Nội dung', 'category' => 'Ưu đãi', 'status' => 'published', 'published_at' => now()]);

        $this->actingAs($admin)->putJson('/api/v1/admin/promotions-page', [
            'title' => 'Ưu đãi dành riêng cho bạn',
            'featured_article_id' => $promotion->id,
            'seo' => ['title' => 'Ưu đãi LADYSTARS'],
        ])->assertOk()->assertJsonPath('data.content.featured_article_id', $promotion->id);

        $this->actingAs($admin)->postJson('/api/v1/admin/promotions-page/cta-image', [
            'image' => UploadedFile::fake()->image('cta.webp'),
        ])->assertCreated();
        $this->assertNotNull($this->getJson('/api/v1/promotions-page')->assertOk()->json('data.content.cta_image_path'));
    }

    public function test_promotion_admin_routes_require_admin(): void
    {
        $this->seed();
        $this->getJson('/api/v1/admin/promotions-page')->assertUnauthorized();
        $user = User::where('role', 'user')->firstOrFail();
        $this->actingAs($user)->getJson('/api/v1/admin/promotions-page')->assertForbidden();
    }
}
