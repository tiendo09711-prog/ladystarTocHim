<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\ContentPage;
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

        StoreSetting::create(['store_name' => 'LADYSTARS', 'order_prefix' => 'LS', 'currency' => 'VND', 'shipping_fee' => 40000, 'free_shipping_from' => 1200000, 'low_stock_threshold' => 0, 'bank_transfer_enabled' => false, 'returns_enabled' => false, 'return_window_days' => 0, 'exchange_enabled' => false, 'exchange_window_days' => 0, 'refund_shipping_on_full_return' => false, 'warranty_enabled' => false, 'appointments_enabled' => false, 'appointment_cancel_before_hours' => 0, 'store_timezone' => 'Asia/Ho_Chi_Minh']);
        $this->getJson('/api/v1/content-pages/chinh-sach-giao-hang')->assertOk()->assertJsonPath('data.content.intro', 'Phí hiện tại: 40.000đ.')->assertJsonPath('data.content.sections.0.body', 'Miễn phí từ 1.200.000đ.');
    }

    public function test_public_settings_hide_internal_fields_and_empty_database_stays_unconfigured(): void
    {
        $this->getJson('/api/v1/settings/public')->assertOk()->assertJsonPath('data.configured', false)->assertJsonMissingPath('data.shipping_fee');
        StoreSetting::create(['store_name' => 'LADYSTARS', 'order_prefix' => 'LS', 'currency' => 'VND', 'shipping_fee' => 40000, 'free_shipping_from' => 1200000, 'low_stock_threshold' => 0, 'bank_transfer_enabled' => true, 'returns_enabled' => true, 'return_window_days' => 7, 'exchange_enabled' => true, 'exchange_window_days' => 7, 'refund_shipping_on_full_return' => false, 'warranty_enabled' => true, 'appointments_enabled' => true, 'appointment_cancel_before_hours' => 4, 'store_timezone' => 'Asia/Ho_Chi_Minh']);
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
    public function test_import_requires_existing_active_category_and_branch_without_leaking_exception(): void
    {
        $admin = User::factory()->admin()->create();
        $response = $this->actingAs($admin)->postJson('/api/v1/admin/import/products', ['rows' => [['name' => 'Imported', 'base_sku' => 'IMP-001', 'variant_sku' => 'IMP-001-V', 'category' => 'Missing', 'branch_code' => 'MISSING', 'price' => 100000]]]);
        $response->assertOk()->assertJsonPath('data.created', 0)->assertJsonPath('data.failed', 1)->assertJsonPath('data.errors.0.message', 'Không tìm thấy danh mục được chỉ định.');
        $this->assertDatabaseCount('categories', 0);
    }

    public function test_category_navigation_only_returns_active_categories_marked_for_menu(): void
    {
        Category::create(['name' => 'Hidden', 'slug' => 'hidden', 'is_active' => true, 'show_in_menu' => false]);
        Category::create(['name' => 'Visible', 'slug' => 'visible', 'is_active' => true, 'show_in_menu' => true]);
        $this->getJson('/api/v1/categories')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'visible');
    }

    public function test_admin_can_persist_validated_hair_finder_configuration(): void
    {
        $admin = User::factory()->admin()->create();
        $payload = ['store_name' => 'LADYSTARS', 'order_prefix' => 'LS', 'currency' => 'VND', 'shipping_fee' => 0, 'free_shipping_from' => 0, 'low_stock_threshold' => 0, 'bank_transfer_enabled' => false, 'returns_enabled' => false, 'return_window_days' => 0, 'exchange_enabled' => false, 'exchange_window_days' => 0, 'refund_shipping_on_full_return' => false, 'warranty_enabled' => false, 'appointments_enabled' => false, 'appointment_cancel_before_hours' => 0, 'store_timezone' => 'Asia/Ho_Chi_Minh', 'hair_finder_config' => ['content' => ['title' => 'Finder'], 'actions' => ['next' => 'Tiếp tục'], 'format' => ['locale' => 'vi-VN', 'currency' => 'VND'], 'questions' => [['key' => 'usage', 'type' => 'single', 'title' => 'Nhu cầu?', 'choices' => [['value' => 'daily', 'label' => 'Hàng ngày']]]], 'budget' => ['labels' => ['Cân bằng'], 'minimum_step' => 100000, 'rounding_step' => 100000], 'scoring' => ['result_limit' => 5]]];
        $this->actingAs($admin)->putJson('/api/v1/admin/settings', $payload)->assertOk()->assertJsonPath('data.hair_finder_config.content.title', 'Finder')->assertJsonMissingPath('data.hair_finder_config.format.currency');
        $this->getJson('/api/v1/hair-finder/options')->assertOk()->assertJsonPath('data.format.currency', 'VND')->assertJsonPath('data.questions.0.choices.0.value', 'daily');
    }
}
