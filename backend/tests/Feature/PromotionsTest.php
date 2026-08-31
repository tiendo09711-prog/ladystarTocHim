<?php

namespace Tests\Feature;

use App\Models\NewsArticle;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PromotionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_promotions_page_only_returns_current_promotions_with_active_products(): void
    {
        $this->seed();
        $product = Product::where('status', 'active')->firstOrFail();
        $current = $this->promotion('Ưu đãi mới', 'uu-dai-moi', $product, [
            'promotion_starts_at' => now()->subDay(),
            'promotion_ends_at' => now()->addDay(),
        ]);
        $future = $this->promotion('Ưu đãi sắp tới', 'uu-dai-sap-toi', $product, ['promotion_starts_at' => now()->addDay()]);
        $expired = $this->promotion('Ưu đãi hết hạn', 'uu-dai-het-han', $product, ['promotion_ends_at' => now()->subDay()]);
        $draft = $this->promotion('Ưu đãi nháp', 'uu-dai-nhap', $product, ['status' => 'draft']);
        $withoutProduct = NewsArticle::create([
            'title' => 'Ưu đãi không có sản phẩm',
            'slug' => 'uu-dai-khong-san-pham',
            'content' => 'Nội dung',
            'content_type' => NewsArticle::TYPE_PROMOTION,
            'category' => 'Ưu đãi',
            'status' => 'published',
            'published_at' => now(),
            'promotion_conditions' => 'Điều kiện áp dụng.',
        ]);
        NewsArticle::create(['title' => 'Tin thường', 'slug' => 'tin-thuong', 'content' => 'Nội dung', 'category' => 'Cẩm nang', 'status' => 'published', 'published_at' => now()]);

        $response = $this->getJson('/api/v1/promotions-page')->assertOk();
        $this->assertSame($current->id, $response->json('data.featured.id'));
        $slugs = collect($response->json('data.articles.data'))->pluck('slug');
        $this->assertNotContains($future->slug, $slugs);
        $this->assertNotContains($expired->slug, $slugs);
        $this->assertNotContains($draft->slug, $slugs);
        $this->assertNotContains($withoutProduct->slug, $slugs);
        $this->assertNotContains('tin-thuong', $slugs);
    }

    public function test_admin_can_create_promotion_with_products_and_list_assignment_summary(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $product = Product::where('status', 'active')->firstOrFail();

        $created = $this->actingAs($admin)->postJson('/api/v1/admin/promotions', [
            'title' => 'Đặc quyền tháng mới',
            'slug' => 'dac-quyen-thang-moi',
            'content' => 'Nội dung ưu đãi.',
            'status' => 'published',
            'promotion_badge' => 'Giảm 10%',
            'promotion_conditions' => 'Áp dụng cho sản phẩm đã chọn.',
            'promotion_starts_at' => now()->subHour()->toISOString(),
            'promotion_ends_at' => now()->addWeek()->toISOString(),
            'product_ids' => [$product->id],
        ])->assertCreated()
            ->assertJsonPath('data.products.0.id', $product->id);

        $this->assertDatabaseHas('news_article_product', ['news_article_id' => $created->json('data.id'), 'product_id' => $product->id]);
        $this->actingAs($admin)->getJson('/api/v1/admin/promotions')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $created->json('data.id'))
            ->assertJsonPath('data.data.0.products_count', 1)
            ->assertJsonPath('data.data.0.promotion_badge', 'Giảm 10%');
    }

    public function test_published_promotion_requires_conditions_and_an_active_product(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();

        $this->actingAs($admin)->postJson('/api/v1/admin/promotions', [
            'title' => 'Ưu đãi chưa đủ dữ liệu',
            'slug' => 'uu-dai-chua-du-du-lieu',
            'content' => 'Nội dung ưu đãi.',
            'status' => 'published',
        ])->assertUnprocessable()->assertJsonValidationErrors(['promotion_conditions', 'product_ids']);

        $draft = NewsArticle::create([
            'title' => 'Ưu đãi nháp',
            'slug' => 'uu-dai-nhap',
            'content' => 'Nội dung ưu đãi.',
            'content_type' => NewsArticle::TYPE_PROMOTION,
            'category' => 'Ưu đãi',
            'status' => 'draft',
        ]);
        $this->actingAs($admin)->patchJson("/api/v1/admin/promotions/{$draft->id}/status", ['status' => 'published'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('promotion_conditions');
    }

    public function test_promotion_detail_and_product_detail_expose_matching_active_promotion(): void
    {
        $this->seed();
        $product = Product::where('status', 'active')->firstOrFail();
        $promotion = $this->promotion('Ưu đãi theo sản phẩm', 'uu-dai-theo-san-pham', $product, [
            'promotion_badge' => 'Quà tặng',
            'promotion_conditions' => 'Mua đúng sản phẩm và không cộng dồn chương trình khác.',
            'promotion_ends_at' => now()->addWeek(),
        ]);

        $this->getJson("/api/v1/promotions/{$promotion->slug}")
            ->assertOk()
            ->assertJsonPath('data.promotion_conditions', $promotion->promotion_conditions)
            ->assertJsonPath('data.products.0.id', $product->id)
            ->assertJsonPath('data.products.0.slug', $product->slug);

        $this->getJson("/api/v1/products/{$product->slug}")
            ->assertOk()
            ->assertJsonPath('data.promotions.0.slug', $promotion->slug)
            ->assertJsonPath('data.promotions.0.conditions', $promotion->promotion_conditions);
    }

    public function test_admin_can_update_promotion_page_content_and_cta_image(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $product = Product::where('status', 'active')->firstOrFail();
        $promotion = $this->promotion('Ưu đãi nổi bật', 'uu-dai-noi-bat', $product);

        $this->actingAs($admin)->putJson('/api/v1/admin/promotions-page', [
            'title' => 'Ưu đãi dành riêng cho bạn',
            'featured_article_id' => $promotion->id,
            'seo' => ['title' => 'Ưu đãi LADYSTARS'],
        ])->assertOk()->assertJsonPath('data.content.featured_article_id', $promotion->id);

        $this->getJson('/api/v1/promotions-page')
            ->assertOk()
            ->assertJsonPath('data.content.title', 'Ưu đãi dành riêng cho bạn');

        $this->actingAs($admin)->postJson('/api/v1/admin/promotions-page/cta-image', [
            'image' => UploadedFile::fake()->image('cta.webp', 1200, 900),
        ])->assertCreated();
        $this->assertNotNull($this->getJson('/api/v1/promotions-page')->assertOk()->json('data.content.cta_image_path'));
    }

    public function test_promotion_admin_routes_and_product_options_require_admin(): void
    {
        $this->seed();
        $this->getJson('/api/v1/admin/promotions-page')->assertUnauthorized();
        $this->getJson('/api/v1/admin/promotions/product-options')->assertUnauthorized();

        $user = User::where('role', 'user')->firstOrFail();
        $this->actingAs($user)->getJson('/api/v1/admin/promotions-page')->assertForbidden();
        $this->actingAs($user)->getJson('/api/v1/admin/promotions/product-options')->assertForbidden();

        $admin = User::where('role', 'admin')->firstOrFail();
        $this->actingAs($admin)->getJson('/api/v1/admin/promotions/product-options')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'base_sku', 'image_path']]]);
    }

    private function promotion(string $title, string $slug, Product $product, array $attributes = []): NewsArticle
    {
        $promotion = NewsArticle::create(array_merge([
            'title' => $title,
            'slug' => $slug,
            'content' => 'Nội dung ưu đãi.',
            'content_type' => NewsArticle::TYPE_PROMOTION,
            'category' => 'Ưu đãi',
            'status' => 'published',
            'published_at' => now(),
            'promotion_conditions' => 'Điều kiện áp dụng.',
        ], $attributes));
        $promotion->products()->attach($product->id);

        return $promotion;
    }
}
