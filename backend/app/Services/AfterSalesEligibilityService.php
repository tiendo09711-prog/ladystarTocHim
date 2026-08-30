<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ReturnRequest;
use App\Models\StoreSetting;
use Carbon\CarbonInterface;

class AfterSalesEligibilityService
{
    public function forOrder(Order $order): array
    {
        $order->loadMissing('shipment', 'items.product');
        $settings = StoreSetting::current();
        $reference = $this->deliveryReferenceAt($order);
        $returnUntil = $reference?->copy()->addDays((int) $settings->return_window_days);
        $exchangeUntil = $reference?->copy()->addDays((int) $settings->exchange_window_days);

        return $order->items->mapWithKeys(function (OrderItem $item) use ($order, $settings, $reference, $returnUntil, $exchangeUntil) {
            $returnable = $this->returnableQuantity($item);
            $warrantyable = $this->warrantyableQuantity($item);
            $warrantyDays = $item->warranty_days_snapshot ?? $item->product?->warranty_days;
            $warrantyUntil = $reference && $warrantyDays !== null ? $reference->copy()->addDays((int) $warrantyDays) : null;
            $canReturn = $returnable > 0 && $this->canReturn($order);
            $canExchange = $returnable > 0 && $this->canExchange($order);
            $canWarranty = $warrantyable > 0 && $this->canClaimWarranty($order, $item);

            $returnReason = $canReturn ? null : $this->disabledReason((bool) $settings->returns_enabled, $order, $returnable, $returnUntil);
            $exchangeReason = $canExchange ? null : $this->disabledReason((bool) $settings->exchange_enabled, $order, $returnable, $exchangeUntil);
            $warrantyReason = $canWarranty ? null : $this->disabledReason((bool) $settings->warranty_enabled, $order, $warrantyable, $warrantyUntil);

            return [$item->id => [
                'can_return' => $canReturn,
                'return_quantity' => $returnable,
                'return_until' => $returnUntil?->toIso8601String(),
                'can_exchange' => $canExchange,
                'exchange_quantity' => $returnable,
                'exchange_until' => $exchangeUntil?->toIso8601String(),
                'can_warranty' => $canWarranty,
                'warranty_quantity' => $warrantyable,
                'warranty_until' => $warrantyUntil?->toIso8601String(),
                'return_disabled_reason' => $returnReason,
                'exchange_disabled_reason' => $exchangeReason,
                'warranty_disabled_reason' => $warrantyReason,
                'return' => $this->countdown($canReturn, $returnUntil, $returnReason),
                'exchange' => $this->countdown($canExchange, $exchangeUntil, $exchangeReason),
                'warranty' => $this->countdown($canWarranty, $warrantyUntil, $warrantyReason),
            ]];
        })->all();
    }

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

    public function warrantyableQuantity(OrderItem $item): int
    {
        $claimed = $item->warrantyRequests()->whereNotIn('status', ['rejected', 'cancelled'])->sum('quantity');

        return max(0, (int) $item->quantity - (int) $claimed);
    }

    private function withinWindow(Order $order, bool $enabled, int $days): bool
    {
        $reference = $this->deliveryReferenceAt($order);

        return $enabled && $order->order_status === 'completed' && $reference && now()->lte($reference->copy()->addDays($days));
    }

    private function disabledReason(bool $enabled, Order $order, int $quantity, ?CarbonInterface $until): string
    {
        return match (true) {
            ! $enabled => 'disabled',
            $order->order_status !== 'completed' => 'order_not_completed',
            $quantity <= 0 => 'quantity_exhausted',
            ! $until => 'policy_unavailable',
            now()->gt($until) => 'window_expired',
            default => 'not_eligible',
        };
    }

    private function countdown(bool $eligible, ?CarbonInterface $expiresAt, ?string $reason): array
    {
        return [
            'eligible' => $eligible,
            'expires_at' => $expiresAt?->toIso8601String(),
            'days_remaining' => $expiresAt ? max(0, now()->startOfDay()->diffInDays($expiresAt->copy()->startOfDay(), false)) : null,
            'reason_if_not_eligible' => $reason,
        ];
    }
}
