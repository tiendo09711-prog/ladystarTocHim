<?php

namespace Tests\Feature;

use App\Models\CatalogPageContent;
use App\Models\Product;
use App\Models\Service;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HairGuideTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_hair_guide_uses_hair_care_service_fallback_title(): void
    {
        $this->getJson('/api/v1/hair-guide')
            ->assertOk()
            ->assertJsonPath('data.title', 'Dịch vụ chăm sóc tóc phù hợp với bạn');
    }

    public function test_public_hair_guide_returns_active_services_in_saved_order(): void
    {
        $this->seed();
        $first = Service::create(['name' => 'Second service', 'slug' => 'second-service', 'price' => 200000, 'sort_order' => 20, 'status' => 'active']);
        $second = Service::create(['name' => 'First service', 'slug' => 'first-service', 'price' => 100000, 'sort_order' => 10, 'status' => 'active']);
        StoreSetting::current()->update(['support_phone' => '0909000000']);

        $this->getJson('/api/v1/hair-guide')
            ->assertOk()
            ->assertJsonPath('data.page_key', 'hair-guide')
            ->assertJsonPath('data.title', 'Dịch vụ chăm sóc tóc phù hợp với bạn')
            ->assertJsonPath('data.seo.title', 'Dịch vụ chăm sóc tóc | LADYSTARS')
            ->assertJsonPath('data.services.0.id', $second->id)
            ->assertJsonPath('data.services.1.id', $first->id)
            ->assertJsonMissingPath('data.products')
            ->assertJsonPath('data.contact.support_phone', '0909000000');
    }

    public function test_public_hair_guide_skips_inactive_services_and_keeps_contact_safe(): void
    {
        $active = Service::create(['name' => 'Active', 'slug' => 'active', 'price' => 100000, 'sort_order' => 10, 'status' => 'active']);
        Service::create(['name' => 'Inactive', 'slug' => 'inactive', 'price' => 100000, 'sort_order' => 20, 'status' => 'inactive']);

        $this->getJson('/api/v1/hair-guide')
            ->assertOk()
            ->assertJsonCount(1, 'data.services')
            ->assertJsonPath('data.services.0.id', $active->id)
            ->assertJsonMissingPath('data.contact.store_name');
    }

    public function test_hair_guide_admin_requires_admin_and_validates_duplicate_products(): void
    {
        $this->seed();
        $product = Product::where('status', 'active')->firstOrFail();
        $payload = $this->payload([['product_id' => $product->id], ['product_id' => $product->id]]);

        $this->putJson('/api/v1/admin/catalog/content/hair-guide', $payload)->assertUnauthorized();
        $this->actingAs(User::where('role', 'user')->firstOrFail())->putJson('/api/v1/admin/catalog/content/hair-guide', $payload)->assertForbidden();
        $this->actingAs(User::where('role', 'admin')->firstOrFail())->putJson('/api/v1/admin/catalog/content/hair-guide', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('settings_json.guide_products.1.product_id');
    }

    public function test_admin_can_update_and_manage_hair_guide_images(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $product = Product::where('status', 'active')->firstOrFail();

        $this->actingAs($admin)->putJson('/api/v1/admin/catalog/content/hair-guide', $this->payload([['product_id' => $product->id, 'badge' => 'Daily']]))
            ->assertOk()
            ->assertJsonPath('data.settings_json.guide_products.0.product_id', $product->id);
        $this->actingAs($admin)->postJson('/api/v1/admin/catalog/content/hair-guide/images', ['slot' => 'hero', 'image' => UploadedFile::fake()->image('guide.jpg', 800, 600)])
            ->assertCreated();
        $path = CatalogPageContent::where('page_key', 'hair-guide')->value('hero_image_path');
        Storage::disk('public')->assertExists($path);
        $this->actingAs($admin)->deleteJson('/api/v1/admin/catalog/content/hair-guide/images', ['slot' => 'hero'])->assertOk();
        Storage::disk('public')->assertMissing($path);
    }

    public function test_consultation_request_keeps_service_context_from_server(): void
    {
        $service = Service::create(['name' => 'Vệ sinh tóc giả', 'slug' => 've-sinh-toc-gia', 'price' => 100000, 'sort_order' => 10, 'status' => 'active']);

        $this->postJson('/api/v1/consultation-requests', [
            'name' => 'Guide Customer',
            'phone' => '0900000000',
            'service_id' => $service->id,
            'service_name' => 'Tên giả mạo',
            'source_page' => '/dich-vu-cham-soc',
        ])->assertCreated();

        $this->assertDatabaseHas('consultation_requests', ['service_id' => $service->id, 'service_name' => $service->name, 'source_page' => '/dich-vu-cham-soc']);
    }

    private function payload(array $guideProducts): array
    {
        return [
            'eyebrow' => 'Guide',
            'title' => 'Guide title',
            'subtitle' => 'Guide subtitle',
            'editorial_title' => 'Criteria',
            'editorial_intro' => 'Criteria intro',
            'editorial_sections_json' => [
                ['title' => 'One', 'body' => 'One body'],
                ['title' => 'Two', 'body' => 'Two body'],
                ['title' => 'Three', 'body' => 'Three body'],
                ['title' => 'Four', 'body' => 'Four body'],
            ],
            'consultation_title' => 'Consultation',
            'consultation_body' => 'Consultation body',
            'consultation_cta_label' => 'Send request',
            'settings_json' => [
                'hero_badge' => 'Guide badge',
                'trust_items' => [['title' => 'Trust', 'description' => 'Trust description']],
                'guide_grid_title' => 'Guide products',
                'guide_grid_intro' => 'Guide products intro',
                'guide_products' => $guideProducts,
                'product_primary_cta_label' => 'Details',
                'product_secondary_cta_label' => 'Consult',
                'consultation_benefits' => ['Benefit'],
            ],
            'seo' => ['title' => 'Hair guide SEO', 'description' => 'Hair guide description'],
            'is_active' => true,
        ];
    }
}
