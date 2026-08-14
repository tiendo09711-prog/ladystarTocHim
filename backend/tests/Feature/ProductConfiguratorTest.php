<?php

namespace Tests\Feature;

use App\Models\Attribute;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductConfiguratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_show_returns_configurator_metadata_reviews_and_sales(): void
    {
        $this->seed();
        $product = Product::where('status', 'active')->firstOrFail();
        $response = $this->getJson('/api/v1/products/'.$product->slug)->assertOk();
        $response->assertJsonStructure(['data' => [
            'sold_count', 'variant_options', 'reviews',
            'images' => [['product_variant_id']],
            'variants' => [['attributes' => [['attribute_code', 'attribute_name', 'value_id']]]],
        ]]);
        $this->assertNotEmpty($response->json('data.variant_options'));
        $this->assertSame(1, $response->json('data.sold_count'));
    }

    public function test_admin_rejects_duplicate_variant_combination(): void
    {
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $values = Attribute::whereIn('code', ['color', 'base_size'])->with('values')->get()->pluck('values.0.id')->values()->all();
        $payload = [
            'name' => 'Configurator Test', 'slug' => 'configurator-test', 'base_sku' => 'CFG-001',
            'category_id' => Category::value('id'), 'description' => 'Test', 'status' => 'active',
            'is_featured' => false, 'is_new' => false,
            'variants' => [
                ['sku' => 'CFG-001-A', 'price' => 1000000, 'status' => 'active', 'attribute_value_ids' => $values],
                ['sku' => 'CFG-001-B', 'price' => 1200000, 'status' => 'active', 'attribute_value_ids' => array_reverse($values)],
            ],
        ];

        $this->actingAs($admin)->postJson('/api/v1/admin/products', $payload)->assertUnprocessable()->assertJsonValidationErrors('variants.1.attribute_value_ids');
    }
}
