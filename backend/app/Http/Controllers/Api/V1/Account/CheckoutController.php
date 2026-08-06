<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Store\CheckoutRequest;
use App\Services\CheckoutService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    use ApiResponse;

    public function __construct(private CheckoutService $checkoutService) {}

    public function preview(Request $request)
    {
        return $this->success($this->checkoutService->preview($request->user(), $request->input('coupon_code')));
    }

    public function place(CheckoutRequest $request)
    {
        return $this->success($this->checkoutService->place($request->user(), $request->validated()), 'Đặt hàng thành công.', 201);
    }
}
