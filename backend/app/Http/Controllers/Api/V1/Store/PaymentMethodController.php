<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Storage;

class PaymentMethodController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $settings = StoreSetting::query()->first();
        if (! $settings || ! $settings->isConfigured()) {
            return $this->success(['configured' => false, 'shipping' => null, 'cod' => ['enabled' => false], 'bank_transfer' => ['enabled' => false]]);
        }

        return $this->success([
            'configured' => true,
            'shipping' => ['fee' => (float) $settings->shipping_fee, 'free_from' => (float) $settings->free_shipping_from],
            'cod' => ['enabled' => (bool) $settings->cod_enabled],
            'bank_transfer' => [
                'enabled' => (bool) $settings->bank_transfer_enabled,
                'bank_name' => $settings->bank_name,
                'account_name' => $settings->bank_account_name,
                'account_number' => $settings->bank_account_number,
                'bank_branch' => $settings->bank_branch,
                'qr_path' => $settings->bank_qr_path ? Storage::url($settings->bank_qr_path) : null,
                'instruction' => $settings->bank_transfer_note,
            ],
        ]);
    }
}
