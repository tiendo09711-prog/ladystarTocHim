<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Attribute;
use App\Models\CatalogPageContent;
use App\Models\Category;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_can_search_filter_and_view_products(): void
    {
        $this->seed();
        $list = $this->getJson('/api/v1/products?search=Hair&in_stock=1&sort=price_asc&per_page=5');
        $list->assertOk()->assertJsonPath('success', true)->assertJsonCount(5, 'data.data');
        $slug = $list->json('data.data.0.slug');
        $this->getJson('/api/v1/products/'.$slug)->assertOk()->assertJsonPath('data.slug', $slug)->assertJsonStructure(['data' => ['variants', 'images', 'category']]);
    }

    public function test_catalog_content_and_filter_metadata_are_public(): void
    {
        $this->seed();
        $this->getJson('/api/v1/catalog/content')->assertOk()->assertJsonStructure(['data' => ['title', 'settings', 'seo']]);
        $this->getJson('/api/v1/catalog/filters')->assertOk()->assertJsonStructure(['data' => ['categories', 'brands', 'materials', 'attributes', 'price']]);
    }

    public function test_catalog_accepts_multiple_values_for_a_filter_attribute(): void
    {
        $this->seed();
        $values = Attribute::where('code', 'color')->firstOrFail()->values()->limit(2)->pluck('value')->all();
        $query = http_build_query(['color' => $values]);
        $this->getJson('/api/v1/products?'.$query)->assertOk()->assertJsonPath('success', true);
    }

    public function test_consultation_request_is_saved_and_admin_only_listed(): void
    {
        $this->postJson('/api/v1/consultation-requests', ['name' => 'Nguyen Van A', 'phone' => '0900000000', 'source_page' => '/san-pham'])->assertCreated();
        $this->assertDatabaseHas('consultation_requests', ['name' => 'Nguyen Van A', 'status' => 'new']);
        $this->getJson('/api/v1/admin/consultation-requests')->assertUnauthorized();
        $this->seed();
        $this->actingAs(User::where('role', 'admin')->firstOrFail())->getJson('/api/v1/admin/consultation-requests')->assertOk();
    }

    public function test_admin_can_upload_and_delete_catalog_image(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $this->actingAs($admin)->postJson('/api/v1/admin/catalog/content/products/images', ['slot' => 'hero', 'image' => UploadedFile::fake()->image('hero.jpg', 800, 600)])->assertCreated();
        $path = \App\Models\CatalogPageContent::where('page_key', 'products')->value('hero_image_path');
        Storage::disk('public')->assertExists($path);
        $this->actingAs($admin)->deleteJson('/api/v1/admin/catalog/content/products/images', ['slot' => 'hero'])->assertOk();
        Storage::disk('public')->assertMissing($path);
    }

    public function test_admin_upload_creates_missing_catalog_content_record(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $category = Category::where('slug', 'phu-kien-toc-gia')->firstOrFail();
        $pageKey = 'category-'.$category->id;
        CatalogPageContent::where('page_key', $pageKey)->delete();

        $this->actingAs($admin)->postJson('/api/v1/admin/catalog/content/'.$pageKey.'/images', [
            'slot' => 'hero',
            'image' => UploadedFile::fake()->image('hero.jpg', 1200, 1000),
        ])->assertCreated();

        $content = CatalogPageContent::where('page_key', $pageKey)->firstOrFail();
        $this->assertSame($category->id, $content->category_id);
        Storage::disk('public')->assertExists($content->hero_image_path);
    }
}
