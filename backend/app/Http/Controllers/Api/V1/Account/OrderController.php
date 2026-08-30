<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Services\AfterSalesEligibilityService;
use App\Services\BuyAgainService;
use App\Services\OrderLifecycleService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        return $this->success($request->user()->orders()->with('items')->latest()->paginate(10));
    }

    public function show(Request $request, string $orderNumber, AfterSalesEligibilityService $eligibility, BuyAgainService $buyAgain)
    {
        $order = $request->user()->orders()->where('order_number', $orderNumber)->with('items.product.images', 'items.product.variants', 'items.review', 'statusHistories', 'payment', 'shipment')->firstOrFail();

        $eligibilityByItem = $eligibility->forOrder($order);
        $order->items->each(fn ($item) => $item->setAttribute('after_sales_eligibility', $eligibilityByItem[$item->id]));
        $order->setAttribute('can_buy_again', $buyAgain->canBuyAgain($order));

        return $this->success($order->makeHidden('admin_note'));
    }

    public function cancel(Request $request, string $orderNumber, OrderLifecycleService $orderLifecycleService)
    {
        $order = $request->user()->orders()->where('order_number', $orderNumber)->firstOrFail();
        if ($order->order_status !== OrderStatus::Pending->value) {
            throw ValidationException::withMessages(['order' => 'Chỉ có thể hủy đơn đang chờ xác nhận.']);
        }
        $order = $orderLifecycleService->cancel($order, $request->user()->id, [OrderStatus::Pending], 'Khách hàng hủy đơn.');

        return $this->success($order, 'Đã hủy đơn hàng.');
    }

    public function buyAgain(Request $request, string $orderNumber, BuyAgainService $buyAgain)
    {
        $order = $request->user()->orders()->where('order_number', $orderNumber)->firstOrFail();

        return $this->success($buyAgain->execute($request->user(), $order), 'Đã xử lý mua lại đơn hàng.');
    }
}
