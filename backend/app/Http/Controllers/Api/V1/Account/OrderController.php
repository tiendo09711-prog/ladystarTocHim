<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        return $this->success($request->user()->orders()->with('items')->latest()->paginate(10));
    }

    public function show(Request $request, string $orderNumber)
    {
        return $this->success($request->user()->orders()->where('order_number', $orderNumber)->with('items.product.images')->firstOrFail());
    }

    public function cancel(Request $request, string $orderNumber)
    {
        $order = $request->user()->orders()->where('order_number', $orderNumber)->with('items')->firstOrFail();
        if (! in_array($order->order_status, ['pending'], true)) {
            throw ValidationException::withMessages(['order' => 'Chỉ có thể hủy đơn đang chờ xác nhận.']);
        }
        DB::transaction(function () use ($order, $request) {
            foreach ($order->items as $item) {
                $inventory = Inventory::where('branch_id', $order->branch_id)->where('product_variant_id', $item->product_variant_id)->lockForUpdate()->firstOrFail();
                $inventory->decrement('quantity_reserved', $item->quantity);
                InventoryTransaction::create(['branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id, 'type' => 'cancel_release', 'quantity' => $item->quantity, 'quantity_before' => $inventory->quantity_on_hand, 'quantity_after' => $inventory->quantity_on_hand, 'performed_by' => $request->user()->id, 'note' => $order->order_number]);
            }
            $order->update(['order_status' => 'cancelled', 'cancelled_at' => now()]);
        });

        return $this->success($order->refresh(), 'Đã hủy đơn hàng.');
    }
}
