<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\ContentPage;
use App\Models\StoreSetting;
use App\Support\ApiResponse;

class ContentPageController extends Controller
{
    use ApiResponse;

    public function show(string $pageKey)
    {
        $page = ContentPage::query()->where('page_key', $pageKey)->where('is_active', true)->whereNotNull('published_at')->first();
        if (! $page) return $this->success(null);

        $settings = StoreSetting::query()->first();
        $payload = $page->toArray();
        $payload['content'] = $this->resolveTokens($payload['content'] ?? [], $settings);
        $payload['business_rules'] = $this->businessRules($pageKey, $settings);

        return $this->success($payload);
    }

    private function resolveTokens(mixed $value, ?StoreSetting $settings): mixed
    {
        if (is_array($value)) return array_map(fn ($item) => $this->resolveTokens($item, $settings), $value);
        if (! is_string($value)) return $value;

        $tokens = [
            '{{shipping_fee}}' => $settings ? number_format((float) $settings->shipping_fee, 0, ',', '.') . 'đ' : '',
            '{{free_shipping_from}}' => $settings ? number_format((float) $settings->free_shipping_from, 0, ',', '.') . 'đ' : '',
            '{{return_window_days}}' => $settings ? (string) $settings->return_window_days : '',
            '{{exchange_window_days}}' => $settings ? (string) $settings->exchange_window_days : '',
        ];

        return strtr($value, $tokens);
    }

    private function businessRules(string $pageKey, ?StoreSetting $settings): array
    {
        if (! $settings) return ['configured' => false];
        return match ($pageKey) {
            'chinh-sach-giao-hang' => ['configured' => true, 'shipping_fee' => (float) $settings->shipping_fee, 'free_shipping_from' => (float) $settings->free_shipping_from],
            'chinh-sach-doi-tra' => ['configured' => true, 'returns_enabled' => (bool) $settings->returns_enabled, 'return_window_days' => (int) $settings->return_window_days, 'exchange_enabled' => (bool) $settings->exchange_enabled, 'exchange_window_days' => (int) $settings->exchange_window_days],
            default => ['configured' => true],
        };
    }
}
