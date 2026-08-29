<?php

namespace Tests\Feature;

use App\Models\Attribute;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_category_and_adjust_inventory(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $this->actingAs($admin)->postJson('/api/v1/admin/categories', ['name' => 'Danh mục thử', 'slug' => 'danh-muc-thu', 'is_active' => true, 'sort_order' => 99])->assertCreated();
        $inventory = Inventory::firstOrFail();
        $before = $inventory->quantity_on_hand;
        $this->actingAs($admin)->postJson('/api/v1/admin/inventory/adjust', ['branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id, 'quantity' => 5, 'type' => 'adjustment', 'reason_code' => 'stocktake', 'note' => 'Kiểm thử'])->assertOk();
        $this->assertDatabaseHas('inventories', ['id' => $inventory->id, 'quantity_on_hand' => $before + 5]);
        $this->assertDatabaseHas('inventory_transactions', ['product_variant_id' => $inventory->product_variant_id, 'type' => 'adjustment', 'quantity' => 5]);
    }

    public function test_admin_can_create_update_and_soft_delete_product(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $categoryId = Category::value('id');
        $payload = [
            'name' => 'Hair System Kiểm Thử', 'slug' => 'hair-system-kiem-thu', 'base_sku' => 'NH-TEST-001',
            'category_id' => $categoryId, 'description' => 'Sản phẩm phục vụ feature test.', 'status' => 'active',
            'is_featured' => false, 'is_new' => true,
            'variants' => [['sku' => 'NH-TEST-001-A', 'barcode' => '8939999999999', 'price' => 1500000, 'sale_price' => 1400000, 'status' => 'active']],
        ];
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/products', $payload)->assertCreated();
        $productId = $created->json('data.id');
        $payload['name'] = 'Hair System Kiểm Thử Mới';
        $payload['variants'][0]['id'] = $created->json('data.variants.0.id');
        $this->actingAs($admin)->putJson('/api/v1/admin/products/'.$productId, $payload)->assertOk()->assertJsonPath('data.name', 'Hair System Kiểm Thử Mới');
        $this->actingAs($admin)->deleteJson('/api/v1/admin/products/'.$productId)->assertOk();
        $this->assertSoftDeleted('products', ['id' => $productId]);
    }

    public function test_admin_can_manage_attributes_product_images_and_variant_values(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $attribute = Attribute::firstOrFail();
        $value = $attribute->values()->firstOrFail();
        $payload = [
            'name' => 'Toupee ??y ??', 'slug' => 'toupee-day-du', 'base_sku' => 'NH-FULL-001',
            'category_id' => Category::value('id'), 'description' => 'Kiểm thử thuộc tính và ảnh.', 'material' => 'Tóc thật',
            'base_type' => 'Lace', 'origin' => 'Việt Nam', 'status' => 'active', 'is_featured' => true, 'is_new' => true,
            'variants' => [[
                'sku' => 'NH-FULL-001-A', 'barcode' => null, 'price' => 1800000, 'sale_price' => 1650000,
                'cost_price' => 900000, 'weight' => 125, 'status' => 'active', 'attribute_value_ids' => [$value->id],
            ]],
        ];
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/products', $payload)->assertCreated();
        $productId = $created->json('data.id');
        $variantId = $created->json('data.variants.0.id');
        $this->assertDatabaseHas('product_variant_attribute_values', ['product_variant_id' => $variantId, 'attribute_id' => $attribute->id, 'attribute_value_id' => $value->id]);
        $this->actingAs($admin)->post('/api/v1/admin/products/'.$productId.'/images', ['images' => [UploadedFile::fake()->image('toupee.webp', 600, 600)]], ['Accept' => 'application/json'])->assertCreated();
        $image = Product::findOrFail($productId)->images()->firstOrFail();
        Storage::disk('public')->assertExists($image->image_path);
        $this->actingAs($admin)->patchJson('/api/v1/admin/products/'.$productId.'/images/'.$image->id.'/primary')->assertOk()->assertJsonPath('data.is_primary', true);
        $this->actingAs($admin)->patchJson('/api/v1/admin/products/'.$productId.'/images/'.$image->id, ['alt_text' => 'Ảnh toupee phía trước'])->assertOk()->assertJsonPath('data.alt_text', 'Ảnh toupee phía trước');
        $this->actingAs($admin)->post('/api/v1/admin/products/'.$productId.'/images', ['images' => [UploadedFile::fake()->image('toupee-2.webp', 600, 600)]], ['Accept' => 'application/json'])->assertCreated();
        $order = Product::findOrFail($productId)->images()->orderByDesc('id')->pluck('id')->all();
        $this->actingAs($admin)->patchJson('/api/v1/admin/products/'.$productId.'/images/reorder', ['order' => $order])->assertOk();
        $this->assertSame($order, Product::findOrFail($productId)->images()->orderBy('sort_order')->pluck('id')->all());
    }

    public function test_admin_can_manage_auxiliary_modules_and_persistent_settings(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();

        $attributeResponse = $this->actingAs($admin)->postJson('/api/v1/admin/attributes', ['name' => 'Kiểu tóc', 'code' => 'hair_style', 'type' => 'select', 'is_filterable' => true, 'is_variant_attribute' => true, 'is_active' => true])->assertCreated();
        $attributeId = $attributeResponse->json('data.id');
        $valueResponse = $this->actingAs($admin)->postJson('/api/v1/admin/attributes/'.$attributeId.'/values', ['value' => 'straight', 'display_value' => 'Tóc thẳng', 'sort_order' => 0, 'is_active' => true])->assertCreated();
        $this->actingAs($admin)->putJson('/api/v1/admin/attributes/'.$attributeId.'/values/'.$valueResponse->json('data.id'), ['value' => 'straight', 'display_value' => 'Thẳng tự nhiên', 'sort_order' => 1, 'is_active' => true])->assertOk();

        $branchResponse = $this->actingAs($admin)->postJson('/api/v1/admin/branches', ['name' => 'Chi nhánh thử nghiệm', 'code' => 'TEST', 'is_default' => false, 'is_active' => true])->assertCreated();
        $this->actingAs($admin)->putJson('/api/v1/admin/branches/'.$branchResponse->json('data.id'), ['name' => 'Chi nhánh thử nghiệm', 'code' => 'TEST', 'is_default' => true, 'is_active' => true])->assertOk();
        $this->assertSame(1, Branch::where('is_default', true)->count());

        $couponResponse = $this->actingAs($admin)->postJson('/api/v1/admin/coupons', ['code' => 'TEST20', 'type' => 'percentage', 'value' => 20, 'minimum_order_amount' => 500000, 'is_active' => true])->assertCreated();
        $couponId = $couponResponse->json('data.id');
        $this->actingAs($admin)->putJson('/api/v1/admin/coupons/'.$couponId, ['code' => 'TEST20', 'type' => 'percentage', 'value' => 15, 'minimum_order_amount' => 500000, 'is_active' => true])->assertOk()->assertJsonPath('data.value', 15);
        $this->actingAs($admin)->deleteJson('/api/v1/admin/coupons/'.$couponId)->assertOk();
        $this->assertDatabaseMissing('coupons', ['id' => $couponId]);

        $customer = User::where('role', 'user')->firstOrFail();
        $this->actingAs($admin)->patchJson('/api/v1/admin/customers/'.$customer->id.'/status', ['status' => 'blocked'])->assertOk()->assertJsonPath('data.status', 'blocked');
        $review = Review::firstOrFail();
        $this->actingAs($admin)->patchJson('/api/v1/admin/reviews/'.$review->id.'/status', ['status' => 'approved', 'admin_reply' => 'C?m ?n b?n ?? ??nh gi?.'])->assertOk()->assertJsonPath('data.admin_reply', 'C?m ?n b?n ?? ??nh gi?.');

        $settings = ['store_name' => 'Nam Hair Laragon', 'support_phone' => '0909000000', 'support_email' => 'support@namhair.local', 'store_address' => 'TP. Hồ Chí Minh', 'currency' => 'VND', 'shipping_fee' => 35000, 'free_shipping_from' => 1200000, 'low_stock_threshold' => 5, 'order_prefix' => 'NHL'];
        $this->actingAs($admin)->putJson('/api/v1/admin/settings', $settings)->assertOk()->assertJsonPath('data.store_name', 'Nam Hair Laragon');
        $this->actingAs($admin)->getJson('/api/v1/admin/settings')->assertOk()->assertJsonPath('data.shipping_fee', '35000.00');
        foreach (['products', 'orders', 'inventory', 'customers'] as $resource) {
            $this->actingAs($admin)->getJson('/api/v1/admin/export/'.$resource)->assertOk()->assertJsonPath('success', true);
        }
    }

    public function test_barcode_list_includes_variants_without_code_and_can_generate_one(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $variant = ProductVariant::firstOrFail();
        $variant->update(['barcode' => null]);
        $this->actingAs($admin)->getJson('/api/v1/admin/barcodes')->assertOk()->assertJsonFragment(['id' => $variant->id, 'barcode' => null]);
        $this->actingAs($admin)->postJson('/api/v1/admin/barcodes/'.$variant->id.'/generate')->assertOk();
        $this->assertNotNull($variant->refresh()->barcode);
    }
}
