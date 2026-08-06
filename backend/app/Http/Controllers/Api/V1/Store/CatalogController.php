<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use App\Models\Brand;
use App\Models\Category;
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
}
