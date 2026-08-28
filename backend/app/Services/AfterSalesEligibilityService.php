<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ReturnRequest;
use App\Models\StoreSetting;
use Carbon\CarbonInterface;

class AfterSalesEligibilityService
{
    public function deliveryReferenceAt(Order $order): ?CarbonInterface
    {
        $order->loadMissing('shipment');

        return $order->shipment?->delivered_at ?? $order->completed_at;
    }

    public function canReturn(Order $order): bool
    {
        $settings = StoreSetting::current();

        return $this->withinWindow($order, (bool) $settings->returns_enabled, (int) $settings->return_window_days);
    }

    public function canExchange(Order $order): bool
    {
        $settings = StoreSetting::current();

        return $this->withinWindow($order, (bool) $settings->exchange_enabled, (int) $settings->exchange_window_days);
    }

    public function canClaimWarranty(Order $order, OrderItem $item): bool
    {
        $settings = StoreSetting::current();
        $days = $item->warranty_days_snapshot ?? $item->product?->warranty_days;
        $reference = $this->deliveryReferenceAt($order);

        return (bool) $settings->warranty_enabled && $order->order_status === 'completed' && $reference && $days !== null
            && now()->lte($reference->copy()->addDays((int) $days));
    }

    public function returnableQuantity(OrderItem $item): int
    {
        $claimed = $item->returnItems()->whereHas('returnRequest', fn ($query) => $query->whereIn('status', ReturnRequest::ACTIVE_STATUSES))->sum('quantity');

        return max(0, (int) $item->quantity - (int) $claimed);
    }

    private function withinWindow(Order $order, bool $enabled, int $days): bool
    {
        $reference = $this->deliveryReferenceAt($order);

        return $enabled && $order->order_status === 'completed' && $reference && now()->lte($reference->copy()->addDays($days));
    }
}
