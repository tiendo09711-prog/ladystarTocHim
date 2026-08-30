<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\StoreSetting;

class RefundCalculatorService
{
    public function suggestedForReturn(ReturnRequest $return): float
    {
        $return->loadMissing('order.items', 'items.orderItem');
        $allocations = $this->netLineAllocations($return->order);
        $minor = 0;
        foreach ($return->items as $item) {
            $orderItem = $item->orderItem;
            $minor += intdiv($allocations[$orderItem->id] * (int) $item->quantity, max(1, (int) $orderItem->quantity));
        }
        if ($this->shouldRefundShipping($return->order)) {
            $minor += $this->minor($return->order->shipping_fee);
        }

        return $this->decimal($minor);
    }

    public function netLineAllocations(Order $order): array
    {
        $order->loadMissing('items');
        $items = $order->items->sortBy('id')->values();
        $subtotal = max(1, $this->minor($order->subtotal));
        $discount = min($subtotal, $this->minor($order->discount_amount));
        $allocated = 0;
        $result = [];
        foreach ($items as $index => $item) {
            $line = $this->minor($item->line_total);
            $lineDiscount = $index === $items->count() - 1 ? $discount - $allocated : intdiv($discount * $line, $subtotal);
            $allocated += $lineDiscount;
            $result[$item->id] = max(0, $line - $lineDiscount);
        }

        return $result;
    }

    private function shouldRefundShipping(Order $order): bool
    {
        if (! StoreSetting::current()->refund_shipping_on_full_return) {
            return false;
        }
        foreach ($order->items as $item) {
            $claimed = $item->returnItems()->whereHas('returnRequest', fn ($query) => $query->whereIn('status', ReturnRequest::ACTIVE_STATUSES))->sum('quantity');
            if ((int) $claimed < (int) $item->quantity) {
                return false;
            }
        }

        return true;
    }

    private function minor(mixed $amount): int
    {
        return (int) round((float) $amount * 100);
    }

    private function decimal(int $minor): float
    {
        return $minor / 100;
    }
}
