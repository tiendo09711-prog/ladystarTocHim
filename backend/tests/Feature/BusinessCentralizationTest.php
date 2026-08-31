<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\ContentPage;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusinessCentralizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_policy_is_empty_until_admin_publishes_database_content(): void
    {
        $this->getJson('/api/v1/content-pages/chinh-sach-giao-hang')->assertOk()->assertJsonPath('data', null);

        $admin = User::factory()->admin()->create();
        $payload = ['title' => 'Chính sách giao hàng', 'summary' => 'Thông tin giao hàng hiện tại.', 'content' => ['intro' => 'Phí hiện tại: {{shipping_fee}}.', 'sections' => [['title' => 'Quy định', 'body' => 'Miễn phí từ {{free_shipping_from}}.', 'items' => ['Theo dõi trong tài khoản.']]]], 'is_active' => true];
        $this->actingAs($admin)->putJson('/api/v1/admin/content-pages/chinh-sach-giao-hang', $payload)->assertOk();

        StoreSetting::create(['store_name' => 'LADYSTARS', 'order_prefix' => 'LS', 'currency' => 'VND', 'shipping_fee' => 40000, 'free_shipping_from' => 1200000, 'low_stock_threshold' => 0, 'cod_enabled' => false, 'bank_transfer_enabled' => false, 'returns_enabled' => false, 'return_window_days' => 0, 'exchange_enabled' => false, 'exchange_window_days' => 0, 'refund_shipping_on_full_return' => false, 'warranty_enabled' => false, 'appointments_enabled' => false, 'appointment_cancel_before_hours' => 0, 'store_timezone' => 'Asia/Ho_Chi_Minh']);
        $this->getJson('/api/v1/payment-methods')->assertOk()->assertJsonPath('data.shipping.fee', 40000)->assertJsonPath('data.shipping.free_from', 1200000);
        $this->getJson('/api/v1/content-pages/chinh-sach-giao-hang')->assertOk()->assertJsonPath('data.content.intro', 'Phí hiện tại: 40.000 VND.')->assertJsonPath('data.content.sections.0.body', 'Miễn phí từ 1.200.000 VND.');
    }

    public function test_public_settings_hide_internal_fields_and_empty_database_stays_unconfigured(): void
    {
        $this->getJson('/api/v1/settings/public')->assertOk()->assertJsonPath('data.configured', false)->assertJsonMissingPath('data.shipping_fee');
        StoreSetting::create(['store_name' => 'LADYSTARS', 'order_prefix' => 'LS', 'currency' => 'VND', 'shipping_fee' => 40000, 'free_shipping_from' => 1200000, 'low_stock_threshold' => 0, 'cod_enabled' => true, 'bank_transfer_enabled' => true, 'returns_enabled' => true, 'return_window_days' => 7, 'exchange_enabled' => true, 'exchange_window_days' => 7, 'refund_shipping_on_full_return' => false, 'warranty_enabled' => true, 'appointments_enabled' => true, 'appointment_cancel_before_hours' => 4, 'store_timezone' => 'Asia/Ho_Chi_Minh']);
        $this->getJson('/api/v1/settings/public')->assertOk()->assertJsonPath('data.configured', true)->assertJsonMissingPath('data.bank_account_number');
    }

    public function test_admin_currency_is_validated_and_exposed_to_public_consumers(): void
    {
        $admin = User::factory()->admin()->create();
        $payload = ['store_name' => 'Configured Store', 'order_prefix' => 'ORD', 'currency' => 'USD', 'shipping_fee' => 0, 'free_shipping_from' => 0, 'low_stock_threshold' => 0, 'store_timezone' => 'UTC'];

        $this->actingAs($admin)->putJson('/api/v1/admin/settings', $payload)->assertOk()->assertJsonPath('data.currency', 'USD');
        $this->getJson('/api/v1/settings/public')->assertOk()->assertJsonPath('data.currency', 'USD');
        $this->actingAs($admin)->putJson('/api/v1/admin/settings', [...$payload, 'currency' => 'US'])->assertUnprocessable()->assertJsonValidationErrors('currency');
    }

    public function test_cod_availability_is_database_driven_and_enforced_by_checkout(): void
    {
        $this->seed();
        $settings = StoreSetting::query()->firstOrFail();
        $settings->update(['cod_enabled' => false, 'bank_transfer_enabled' => false]);

        $this->getJson('/api/v1/payment-methods')->assertOk()->assertJsonPath('data.cod.enabled', false);
        $variant = ProductVariant::query()->firstOrFail();
        $payload = [
            'items' => [['product_variant_id' => $variant->id, 'quantity' => 1]],
            'customer_name' => 'Checkout Test',
            'customer_email' => 'checkout@example.com',
            'customer_phone' => '0900000000',
            'province' => 'Test',
            'district' => 'Test',
            'ward' => 'Test',
            'shipping_address' => 'Test address',
            'payment_method' => 'cod',
        ];
        $this->postJson('/api/v1/guest-checkout/place-order', $payload)->assertUnprocessable()->assertJsonValidationErrors('payment_method');

        $settings->update(['cod_enabled' => true]);
        $this->getJson('/api/v1/payment-methods')->assertOk()->assertJsonPath('data.cod.enabled', true);
    }

    public function test_backend_root_returns_json_health_response(): void
    {
        $this->get('/')->assertOk()->assertJson(['status' => 'ok']);
    }
    public function test_import_requires_existing_active_category_and_branch_without_leaking_exception(): void
    {
        $admin = User::factory()->admin()->create();
        $response = $this->actingAs($admin)->postJson('/api/v1/admin/import/products', ['rows' => [['name' => 'Imported', 'base_sku' => 'IMP-001', 'variant_sku' => 'IMP-001-V', 'category' => 'Missing', 'description' => 'Imported description', 'branch_code' => 'MISSING', 'price' => 100000]]]);
        $response->assertOk()->assertJsonPath('data.created', 0)->assertJsonPath('data.failed', 1)->assertJsonPath('data.errors.0.message', 'Không tìm thấy danh mục được chỉ định.');
        $this->assertDatabaseCount('categories', 0);
    }

    public function test_import_without_status_creates_an_unpublished_draft_and_inactive_variant(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::create(['name' => 'Import category', 'slug' => 'import-category', 'is_active' => true, 'show_in_menu' => false]);
        $branch = \App\Models\Branch::create(['name' => 'Import branch', 'code' => 'IMP', 'is_active' => true]);

        $this->actingAs($admin)->postJson('/api/v1/admin/import/products', ['rows' => [[
            'name' => 'Imported draft', 'base_sku' => 'IMP-DRAFT', 'variant_sku' => 'IMP-DRAFT-V',
            'category' => $category->name, 'description' => 'Imported draft description', 'branch_code' => $branch->code, 'price' => 100000,
        ]]])->assertOk()->assertJsonPath('data.created', 1);

        $product = \App\Models\Product::where('base_sku', 'IMP-DRAFT')->firstOrFail();
        $this->assertSame('draft', $product->status);
        $this->assertNull($product->published_at);
        $this->assertSame('inactive', $product->variants()->firstOrFail()->status);
    }

    public function test_unconfigured_store_settings_do_not_expose_policy_business_rules(): void
    {
        ContentPage::create(['page_key' => 'chinh-sach-giao-hang', 'title' => 'Shipping', 'content' => ['intro' => 'Fee {{shipping_fee}}'], 'is_active' => true, 'published_at' => now()]);
        StoreSetting::create(['store_name' => '', 'order_prefix' => '', 'currency' => '', 'store_timezone' => null]);

        $this->getJson('/api/v1/content-pages/chinh-sach-giao-hang')
            ->assertOk()
            ->assertJsonPath('data.business_rules.configured', false)
            ->assertJsonPath('data.content.intro', 'Fee {{shipping_fee}}');
    }

    public function test_category_navigation_only_returns_active_categories_marked_for_menu(): void
    {
        Category::create(['name' => 'Hidden', 'slug' => 'hidden', 'is_active' => true, 'show_in_menu' => false]);
        Category::create(['name' => 'Visible', 'slug' => 'visible', 'is_active' => true, 'show_in_menu' => true]);
        $this->getJson('/api/v1/categories')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'visible');
    }

    public function test_hidden_menu_category_remains_available_to_admin_product_selection(): void
    {
        $admin = User::factory()->admin()->create();
        $hidden = Category::create(['name' => 'Product-only', 'slug' => 'product-only', 'is_active' => true, 'show_in_menu' => false]);

        $this->actingAs($admin)->getJson('/api/v1/admin/categories')
            ->assertOk()
            ->assertJsonPath('data.0.id', $hidden->id)
            ->assertJsonPath('data.0.show_in_menu', false);
    }

    public function test_admin_show_in_menu_changes_public_category_navigation(): void
    {
        $admin = User::factory()->admin()->create();
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/categories', [
            'name' => 'Dynamic category',
            'slug' => 'dynamic-category',
            'is_active' => true,
            'show_in_menu' => true,
            'sort_order' => 1,
        ])->assertCreated();

        $this->getJson('/api/v1/categories')->assertOk()->assertJsonPath('data.0.slug', 'dynamic-category');
        $this->actingAs($admin)->putJson('/api/v1/admin/categories/'.$created->json('data.id'), [
            'name' => 'Dynamic category',
            'slug' => 'dynamic-category',
            'is_active' => true,
            'show_in_menu' => false,
            'sort_order' => 1,
        ])->assertOk();
        $this->getJson('/api/v1/categories')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_admin_can_persist_validated_hair_finder_configuration(): void
    {
        $admin = User::factory()->admin()->create();
        $payload = ['store_name' => 'LADYSTARS', 'order_prefix' => 'LS', 'currency' => 'VND', 'shipping_fee' => 0, 'free_shipping_from' => 0, 'low_stock_threshold' => 0, 'cod_enabled' => false, 'bank_transfer_enabled' => false, 'returns_enabled' => false, 'return_window_days' => 0, 'exchange_enabled' => false, 'exchange_window_days' => 0, 'refund_shipping_on_full_return' => false, 'warranty_enabled' => false, 'appointments_enabled' => false, 'appointment_cancel_before_hours' => 0, 'store_timezone' => 'Asia/Ho_Chi_Minh', 'hair_finder_config' => ['content' => ['eyebrow' => 'Finder', 'title' => 'Finder', 'description' => 'Description', 'result_title' => 'Results', 'empty_result' => 'Empty', 'score_template' => ':score%'], 'actions' => ['back' => 'Back', 'next' => 'Tiếp tục', 'submit' => 'Submit', 'loading' => 'Loading', 'restart' => 'Restart'], 'format' => ['locale' => 'vi-VN', 'currency' => 'VND'], 'questions' => [['key' => 'usage', 'type' => 'single', 'title' => 'Nhu cầu?', 'choices' => [['value' => 'daily', 'label' => 'Hàng ngày']]]], 'budget' => ['labels' => ['Cân bằng'], 'minimum_step' => 100000, 'rounding_step' => 100000], 'scoring' => ['result_limit' => 5]]];
        $this->actingAs($admin)->putJson('/api/v1/admin/settings', $payload)->assertOk()->assertJsonPath('data.hair_finder_config.content.title', 'Finder')->assertJsonMissingPath('data.hair_finder_config.format.currency');
        $this->getJson('/api/v1/hair-finder/options')->assertOk()->assertJsonPath('data.format.currency', 'VND')->assertJsonPath('data.questions.0.choices.0.value', 'daily');
    }
}
