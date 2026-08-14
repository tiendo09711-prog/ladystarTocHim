<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Requests\Store\GuestCheckoutRequest;
use App\Services\CheckoutService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class GuestCheckoutController extends Controller
{
    use ApiResponse;

    public function __construct(private CheckoutService $checkoutService) {}

    public function preview(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.product_variant_id' => ['required', 'integer', 'distinct', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'coupon_code' => ['nullable', 'string', 'max:80'],
        ]);

        return $this->success($this->checkoutService->previewGuest($data['items'], $data['coupon_code'] ?? null));
    }

    public function place(GuestCheckoutRequest $request)
    {
        return $this->success($this->checkoutService->placeGuest($request->validated()), 'Đặt hàng thành công.', 201);
    }
}
