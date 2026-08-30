<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\HomePageContent;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class HomePageController extends Controller
{
    use ApiResponse;

    public function show()
    {
        $content = HomePageContent::where('page_key', 'home')->first();
        if (! $content) {
            return $this->success(null);
        }

        return $this->success([
            ...$content->toArray(),
            'hero_image_path' => $this->assetUrl($content->hero_image_path),
            'brand_story_image_path' => $this->assetUrl($content->brand_story_image_path),
            'sections' => $content->normalizedSections(),
        ]);
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) return null;

        return str_starts_with($path, '/') || Str::startsWith($path, ['http://', 'https://'])
            ? $path
            : Storage::disk('public')->url($path);
    }
}
