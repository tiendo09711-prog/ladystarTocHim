<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
