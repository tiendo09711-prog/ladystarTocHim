<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\NewsArticle;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;

class GuideController extends Controller
{
    use ApiResponse;

    private const CATEGORY = 'Hướng dẫn';

    public function show(string $slug)
    {
        $article = NewsArticle::published()
            ->where('category', self::CATEGORY)
            ->where('slug', $slug)
            ->with('author:id,name')
            ->firstOrFail();

        $article->cover_image_path = $this->assetUrl($article->cover_image_path);

        return $this->success($article);
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) return null;

        return str_starts_with($path, '/') || str_starts_with($path, 'http') ? $path : Storage::disk('public')->url($path);
    }
}
