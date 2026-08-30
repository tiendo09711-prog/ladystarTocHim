<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderLifecycleService
{
    public function __construct(private InventoryService $inventoryService, private RefundService $refundService) {}

    public function cancel(Order $order, ?int $actorId = null, array $allowedStatuses = [OrderStatus::Pending, OrderStatus::Confirmed, OrderStatus::Processing], ?string $note = null): Order
    {
        return $this->transition($order, OrderStatus::Cancelled, $actorId, $allowedStatuses, $note);
    }

    public function expirePending(Order $order): ?Order
    {
        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()->with('payment')->lockForUpdate()->findOrFail($order->id);
            if ($lockedOrder->order_status !== OrderStatus::Pending->value || ! $lockedOrder->expires_at || $lockedOrder->expires_at->isFuture()) {
                return null;
            }
            if ($lockedOrder->payment_status === 'paid' || $lockedOrder->payment?->status === 'paid') {
                $lockedOrder->update(['expires_at' => null]);

                return null;
            }

            return $this->cancel($lockedOrder, null, [OrderStatus::Pending], 'Automatically cancelled because the stock reservation expired.');
        });
    }

    public function transition(Order $order, OrderStatus $targetStatus, ?int $actorId = null, ?array $allowedStatuses = null, ?string $note = null): Order
    {
        return DB::transaction(function () use ($order, $targetStatus, $actorId, $allowedStatuses, $note) {
            $lockedOrder = Order::query()->with('items')->lockForUpdate()->findOrFail($order->getKey());
            $currentStatus = OrderStatus::tryFrom($lockedOrder->order_status);

            if ($currentStatus === OrderStatus::Cancelled && $targetStatus === OrderStatus::Cancelled) {
                return $lockedOrder->load('items', 'payment', 'shipment', 'statusHistories');
            }
            if (! $currentStatus || ! in_array($targetStatus, $this->allowedTransitions($currentStatus), true)) {
                throw ValidationException::withMessages(['order_status' => 'Invalid order lifecycle transition.']);
            }
            if ($allowedStatuses !== null && ! in_array($currentStatus, $allowedStatuses, true)) {
                throw ValidationException::withMessages(['order_status' => 'Order is not in an allowed status for this operation.']);
            }

            if ($targetStatus === OrderStatus::Shipping && $lockedOrder->shipment()->lockForUpdate()->value('status') !== 'shipped') {
                throw ValidationException::withMessages(['shipment' => 'Order shipping status must be driven by a shipped shipment.']);
            }
            if ($targetStatus === OrderStatus::Completed) {
                $shipmentStatus = $lockedOrder->shipment()->lockForUpdate()->value('status');
                $paymentStatus = $lockedOrder->payment()->lockForUpdate()->value('status');
                if ($shipmentStatus !== 'delivered') {
                    throw ValidationException::withMessages(['shipment' => 'Order completion requires a delivered shipment.']);
                }
                if ($lockedOrder->payment_status !== 'paid' || $paymentStatus !== 'paid') {
                    throw ValidationException::withMessages(['payment' => 'Order completion requires a paid payment.']);
                }
            }

            if ($targetStatus === OrderStatus::Confirmed) {
                $this->consumeReservedInventory($lockedOrder, $actorId);
            }
            if ($targetStatus === OrderStatus::Cancelled) {
                $this->releaseInventory($lockedOrder, $currentStatus, $actorId);
                $this->releaseCoupon($lockedOrder);
            }

            $updates = ['order_status' => $targetStatus->value];
            if ($targetStatus === OrderStatus::Cancelled) {
                $updates['cancelled_at'] = now();
                $updates['expires_at'] = null;
            }
            if ($targetStatus === OrderStatus::Confirmed) {
                $updates['expires_at'] = null;
            }
            if ($targetStatus === OrderStatus::Completed) {
                $updates['completed_at'] = now();
            }

            $lockedOrder->update($updates);
            $lockedOrder->statusHistories()->create([
                'from_status' => $currentStatus->value,
                'to_status' => $targetStatus->value,
                'changed_by' => $actorId,
                'note' => $note,
                'created_at' => now(),
            ]);

            $paymentStatus = $lockedOrder->payment()->lockForUpdate()->value('status');
            if ($targetStatus === OrderStatus::Cancelled && ($lockedOrder->payment_status === 'paid' || $paymentStatus === 'paid')) {
                if ($paymentStatus !== 'paid') {
                    throw ValidationException::withMessages(['payment' => 'Paid order cache is inconsistent with its payment record.']);
                }
                $this->refundService->createForCancellation($lockedOrder, $actorId, $note);
            }

            return $lockedOrder->refresh()->load('items', 'payment', 'shipment', 'statusHistories', 'refunds');
        });
    }

    private function consumeReservedInventory(Order $order, ?int $actorId): void
    {
        foreach ($order->items as $item) {
            $inventory = $this->lockedInventory($order, $item->product_variant_id);
            if ($inventory->quantity_reserved < $item->quantity || $inventory->quantity_on_hand < $item->quantity) {
                throw ValidationException::withMessages(['stock' => 'Reserved inventory is inconsistent.']);
            }
            $before = $inventory->quantity_on_hand;
            $inventory->update(['quantity_on_hand' => $before - $item->quantity, 'quantity_reserved' => $inventory->quantity_reserved - $item->quantity]);
            InventoryTransaction::create([
                'branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id,
                'type' => 'sale', 'quantity' => -$item->quantity, 'quantity_before' => $before,
                'quantity_after' => $before - $item->quantity, 'reference_type' => Order::class,
                'reference_id' => $order->id, 'performed_by' => $actorId, 'note' => $order->order_number,
            ]);
        }
    }

    private function releaseInventory(Order $order, OrderStatus $currentStatus, ?int $actorId): void
    {
        foreach ($order->items as $item) {
            $inventory = $this->lockedInventory($order, $item->product_variant_id);
            if ($currentStatus === OrderStatus::Pending) {
                if ($inventory->quantity_reserved < $item->quantity) {
                    throw ValidationException::withMessages(['stock' => 'Reserved inventory is inconsistent.']);
                }
                $inventory->decrement('quantity_reserved', $item->quantity);
                InventoryTransaction::create([
                    'branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id,
                    'type' => 'cancel_release', 'quantity' => $item->quantity,
                    'quantity_before' => $inventory->quantity_on_hand, 'quantity_after' => $inventory->quantity_on_hand,
                    'reference_type' => Order::class, 'reference_id' => $order->id,
                    'performed_by' => $actorId, 'note' => $order->order_number,
                ]);

                continue;
            }

            $this->inventoryService->adjust($inventory, $item->quantity, 'cancel_release', $actorId, $order->order_number, $order);
        }
    }

    private function releaseCoupon(Order $order): void
    {
        $usage = DB::table('coupon_usages')->where('order_id', $order->id)->lockForUpdate()->first();
        if (! $usage) {
            return;
        }
        $coupon = Coupon::query()->whereKey($usage->coupon_id)->lockForUpdate()->first();
        if ($coupon && $coupon->used_count > 0) {
            $coupon->update(['used_count' => $coupon->used_count - 1]);
        }
        DB::table('coupon_usages')->where('id', $usage->id)->delete();
    }

    private function lockedInventory(Order $order, int $variantId): Inventory
    {
        return Inventory::query()->where('branch_id', $order->branch_id)->where('product_variant_id', $variantId)->lockForUpdate()->firstOrFail();
    }

    private function allowedTransitions(OrderStatus $status): array
    {
        return match ($status) {
            OrderStatus::Pending => [OrderStatus::Confirmed, OrderStatus::Cancelled],
            OrderStatus::Confirmed => [OrderStatus::Processing, OrderStatus::Cancelled],
            OrderStatus::Processing => [OrderStatus::Shipping, OrderStatus::Cancelled],
            OrderStatus::Shipping => [OrderStatus::Completed, OrderStatus::Cancelled],
            OrderStatus::Completed, OrderStatus::Cancelled => [],
        };
    }
}
