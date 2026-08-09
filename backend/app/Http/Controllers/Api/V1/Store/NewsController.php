<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\NewsArticle;
use App\Support\ApiResponse;

class NewsController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $articles = NewsArticle::published()
            ->where(fn ($query) => $query->whereNull('category')->orWhereNotIn('category', ['Ưu đãi', 'Hướng dẫn']))
            ->orderByDesc('published_at')
            ->orderBy('sort_order')
            ->paginate(9, ['id', 'title', 'slug', 'excerpt', 'cover_image_path', 'cover_image_alt', 'category', 'published_at', 'seo_title', 'seo_description']);

        return $this->success($articles);
    }

    public function show(string $slug)
    {
        $article = NewsArticle::published()
            ->where(fn ($query) => $query->whereNull('category')->orWhereNotIn('category', ['Ưu đãi', 'Hướng dẫn']))
            ->with('author:id,name')
            ->where('slug', $slug)
            ->firstOrFail();

        return $this->success($article);
    }
}
