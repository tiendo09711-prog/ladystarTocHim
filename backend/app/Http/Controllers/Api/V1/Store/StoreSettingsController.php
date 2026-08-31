<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use App\Support\ApiResponse;

class StoreSettingsController extends Controller
{
    use ApiResponse;

    public function public()
    {
        $settings = StoreSetting::query()->first();
        if (! $settings || ! $settings->isConfigured()) return $this->success(['configured' => false]);

        return $this->success([
            'configured' => true,
            'store_name' => $settings->store_name,
            'support_phone' => $settings->support_phone,
            'support_email' => $settings->support_email,
            'store_address' => $settings->store_address,
            'currency' => $settings->currency,
            'returns_enabled' => (bool) $settings->returns_enabled,
            'exchange_enabled' => (bool) $settings->exchange_enabled,
            'warranty_enabled' => (bool) $settings->warranty_enabled,
            'appointments_enabled' => (bool) $settings->appointments_enabled,
        ]);
    }
}
