<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\AfterSalesEligibilityService;
use App\Services\GuestScopeTokenService;
use App\Services\OrderLifecycleService;
use App\Support\ApiResponse;
use App\Support\PhoneNormalizer;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrderTrackingController extends Controller
{
    use ApiResponse;

    public function __construct(private GuestScopeTokenService $tokens, private AfterSalesEligibilityService $eligibility, private OrderLifecycleService $lifecycle) {}

    public function track(Request $request)
    {
        $data = $request->validate([
            'order_number' => ['required', 'string', 'max:80'],
            'phone' => ['required', 'regex:/^[0-9+\s.-]{9,20}$/'],
        ]);
        $order = Order::query()
            ->whereNull('user_id')
            ->where('order_number', trim($data['order_number']))
            ->where('customer_phone', PhoneNormalizer::normalize($data['phone']))
            ->with('items', 'statusHistories', 'payment', 'shipment')
            ->first();

        if (! $order) {
            return $this->error('Không tìm thấy đơn hàng phù hợp.', [], 404);
        }
        $eligibilityByItem = $this->eligibility->forOrder($order);

        return $this->success([
            'order_number' => $order->order_number,
            'created_at' => $order->created_at,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'province' => $order->province,
            'district' => $order->district,
            'ward' => $order->ward,
            'shipping_address' => $order->shipping_address,
            'subtotal' => $order->subtotal,
            'discount_amount' => $order->discount_amount,
            'shipping_fee' => $order->shipping_fee,
            'total_amount' => $order->total_amount,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'order_status' => $order->order_status,
            'items' => $order->items->map(function ($item) use ($eligibilityByItem) {
                $item->setAttribute('after_sales_eligibility', $eligibilityByItem[$item->id]);

                return $item;
            }),
            'status_histories' => $order->statusHistories,
            'payment' => $order->payment?->only(['method', 'provider', 'amount', 'status', 'transaction_code', 'paid_at']),
            'shipment' => $order->shipment?->only(['carrier', 'tracking_number', 'shipping_fee_actual', 'status', 'shipped_at', 'delivered_at', 'tracking_url']),
            'guest_after_sales_token' => $order->user_id === null ? $this->tokens->issue('guest_order_after_sales', $order->id, $order->customer_phone) : null,
        ]);
    }

    public function cancel(Request $request, Order $order)
    {
        abort_unless($order->user_id === null, 404);
        $this->tokens->verify((string) ($request->header('X-Guest-Token') ?: $request->input('token')), 'guest_order_after_sales', $order->id, $order->customer_phone);
        $order->loadMissing('payment');
        if ($order->order_status !== 'pending' || $order->payment_status === 'paid' || $order->payment?->status === 'paid') {
            throw ValidationException::withMessages(['order' => 'Only pending unpaid guest orders can be cancelled.']);
        }

        return $this->success($this->lifecycle->cancel($order, null, [OrderStatus::Pending], 'Guest cancelled order.'));
    }
}
