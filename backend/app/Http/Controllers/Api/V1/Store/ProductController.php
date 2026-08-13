<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Attribute;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = $this->baseQuery();
        $this->applyFilters($query, $request);
        $this->applySort($query, $request->string('sort', 'newest')->toString());
        $products = $query->paginate(min($request->integer('per_page', 12), 48));

        return $this->success(ProductResource::collection($products)->response()->getData(true));
    }

    public function show(string $slug)
    {
        $product = $this->baseQuery()->where('slug', $slug)->firstOrFail();

        return $this->success(new ProductResource($product));
    }

    public function featured(Request $request)
    {
        $request->merge(['is_featured' => true]);

        return $this->index($request);
    }

    public function newest(Request $request)
    {
        $request->merge(['is_new' => true]);

        return $this->index($request);
    }

    public function sale(Request $request)
    {
        $request->merge(['on_sale' => true]);

        return $this->index($request);
    }

    private function baseQuery(): Builder
    {
        return Product::query()->where('status', 'active')->with([
            'category', 'brand', 'images', 'variants' => fn ($query) => $query->where('status', 'active')->with('attributeValues', 'inventories'),
            'promotions' => fn ($query) => $query->activePromotion()->select([
                'news_articles.id', 'title', 'slug', 'excerpt', 'promotion_badge', 'promotion_conditions', 'promotion_starts_at', 'promotion_ends_at',
            ])->orderBy('promotion_ends_at'),
        ])->withAvg(['reviews' => fn ($query) => $query->where('status', 'approved')], 'rating')->withCount(['reviews' => fn ($query) => $query->where('status', 'approved')]);
    }

    private function applyFilters(Builder $query, Request $request): void
    {
        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('base_sku', 'like', "%{$search}%"));
        }
        if ($category = $request->string('category')->toString()) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $category)->orWhere('id', $category));
        }
        if ($brand = $request->string('brand')->toString()) {
            $query->whereHas('brand', fn ($q) => $q->where('slug', $brand)->orWhere('id', $brand));
        }
        foreach (['material', 'base_type'] as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }
        if ($request->boolean('is_featured')) {
            $query->where('is_featured', true);
        }
        if ($request->boolean('is_new')) {
            $query->where('is_new', true);
        }
        if ($request->boolean('on_sale')) {
            $query->whereHas('variants', fn ($q) => $q->whereNotNull('sale_price'));
        }
        if ($request->boolean('in_stock')) {
            $query->whereHas('variants.inventories', fn ($q) => $q->whereColumn('quantity_on_hand', '>', 'quantity_reserved'));
        }
        if ($request->filled('min_price') || $request->filled('max_price')) {
            $query->whereHas('variants', function ($q) use ($request) {
                $q->when($request->filled('min_price'), fn ($x) => $x->whereRaw('COALESCE(sale_price, price) >= ?', [$request->input('min_price')]))
                    ->when($request->filled('max_price'), fn ($x) => $x->whereRaw('COALESCE(sale_price, price) <= ?', [$request->input('max_price')]));
            });
        }
        $codes = Attribute::where('is_active', true)->where('is_filterable', true)->pluck('code');
        foreach ($codes as $code) {
            $values = array_values(array_filter((array) $request->input($code, [])));
            if (! $values) continue;
            $query->whereHas('variants.attributeValues', fn ($valuesQuery) => $valuesQuery->whereIn('value', $values)->whereHas('attribute', fn ($attributeQuery) => $attributeQuery->where('code', $code)));
        }
    }

    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'oldest' => $query->oldest(),
            'name_asc' => $query->orderBy('name'),
            'name_desc' => $query->orderByDesc('name'),
            'price_asc' => $query->orderByRaw('(select min(coalesce(sale_price, price)) from product_variants where product_variants.product_id = products.id and deleted_at is null) asc'),
            'price_desc' => $query->orderByRaw('(select max(coalesce(sale_price, price)) from product_variants where product_variants.product_id = products.id and deleted_at is null) desc'),
            default => $query->latest('published_at'),
        };
    }
}
