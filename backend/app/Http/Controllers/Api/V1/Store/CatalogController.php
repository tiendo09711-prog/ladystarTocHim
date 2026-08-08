<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Support\ApiResponse;

class CatalogController extends Controller
{
    use ApiResponse;

    public function categories()
    {
        return $this->success(Category::where('is_active', true)->with('children')->orderBy('sort_order')->get());
    }

    public function category(string $slug)
    {
        return $this->success(Category::where('slug', $slug)->where('is_active', true)->with('children')->firstOrFail());
    }

    public function brands()
    {
        return $this->success(Brand::where('is_active', true)->orderBy('name')->get());
    }

    public function attributes()
    {
        return $this->success(Attribute::where('is_active', true)->with(['values' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order')])->get());
    }

    public function filters()
    {
        $attributes = Attribute::where('is_active', true)->where('is_filterable', true)
            ->with(['values' => fn ($query) => $query->where('is_active', true)->whereHas('variants.product', fn ($products) => $products->where('status', 'active'))->orderBy('sort_order')])->get();
        $prices = ProductVariant::query()->where('status', 'active')->whereHas('product', fn ($query) => $query->where('status', 'active'))
            ->selectRaw('min(coalesce(sale_price, price)) as min_price, max(coalesce(sale_price, price)) as max_price')->first();

        return $this->success([
            'categories' => Category::where('is_active', true)->whereHas('products', fn ($query) => $query->where('status', 'active'))->orderBy('sort_order')->get(),
            'brands' => Brand::where('is_active', true)->whereHas('products', fn ($query) => $query->where('status', 'active'))->orderBy('name')->get(),
            'materials' => Product::where('status', 'active')->whereNotNull('material')->where('material', '!=', '')->distinct()->orderBy('material')->pluck('material')->values(),
            'attributes' => $attributes,
            'price' => ['min' => (float) ($prices->min_price ?? 0), 'max' => (float) ($prices->max_price ?? 0)],
        ]);
    }
}
