<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'short_description' => $this->short_description,
            'price' => (float) $this->price,
            'duration_minutes' => (int) $this->duration_minutes,
            'image_path' => $this->assetUrl($this->image_path),
            'image_alt' => $this->image_alt,
            'sort_order' => $this->sort_order,
            'status' => $this->status,
        ];
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return str_starts_with($path, '/') || preg_match('/^https?:\/\//', $path)
            ? $path
            : Storage::disk('public')->url($path);
    }
}
