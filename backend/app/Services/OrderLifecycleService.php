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
    public function __construct(private InventoryService $inventoryService) {}

    public function cancel(Order $order, ?int $actorId = null, array $allowedStatuses = [OrderStatus::Pending, OrderStatus::Confirmed, OrderStatus::Processing]): Order
    {
        return $this->transition($order, OrderStatus::Cancelled, $actorId, $allowedStatuses);
    }

    public function transition(Order $order, OrderStatus $targetStatus, ?int $actorId = null, ?array $allowedStatuses = null): Order
    {
        return DB::transaction(function () use ($order, $targetStatus, $actorId, $allowedStatuses) {
            $lockedOrder = Order::query()->with('items')->lockForUpdate()->findOrFail($order->getKey());
            $currentStatus = OrderStatus::tryFrom($lockedOrder->order_status);

            if ($currentStatus === OrderStatus::Cancelled && $targetStatus === OrderStatus::Cancelled) {
                return $lockedOrder;
            }

            if (! $currentStatus || ! in_array($targetStatus, $this->allowedTransitions($currentStatus), true)) {
                throw ValidationException::withMessages(['order_status' => 'Chuyển trạng thái đơn hàng không hợp lệ.']);
            }

            if ($allowedStatuses !== null && ! in_array($currentStatus, $allowedStatuses, true)) {
                throw ValidationException::withMessages(['order_status' => 'Chuyển trạng thái đơn hàng không hợp lệ.']);
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
            }
            if ($targetStatus === OrderStatus::Completed) {
                $updates['completed_at'] = now();
            }

            $lockedOrder->update($updates);

            return $lockedOrder->refresh()->load('items');
        });
    }

    private function consumeReservedInventory(Order $order, ?int $actorId): void
    {
        foreach ($order->items as $item) {
            $inventory = $this->lockedInventory($order, $item->product_variant_id);
            if ($inventory->quantity_reserved < $item->quantity || $inventory->quantity_on_hand < $item->quantity) {
                throw ValidationException::withMessages(['stock' => 'Tồn kho đã thay đổi, không thể xác nhận đơn.']);
            }

            $before = $inventory->quantity_on_hand;
            $inventory->update([
                'quantity_on_hand' => $before - $item->quantity,
                'quantity_reserved' => $inventory->quantity_reserved - $item->quantity,
            ]);
            InventoryTransaction::create([
                'branch_id' => $inventory->branch_id,
                'product_variant_id' => $inventory->product_variant_id,
                'type' => 'sale',
                'quantity' => -$item->quantity,
                'quantity_before' => $before,
                'quantity_after' => $before - $item->quantity,
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'performed_by' => $actorId,
                'note' => $order->order_number,
            ]);
        }
    }

    private function releaseInventory(Order $order, OrderStatus $currentStatus, ?int $actorId): void
    {
        foreach ($order->items as $item) {
            $inventory = $this->lockedInventory($order, $item->product_variant_id);

            if ($currentStatus === OrderStatus::Pending) {
                if ($inventory->quantity_reserved < $item->quantity) {
                    throw ValidationException::withMessages(['stock' => 'Tồn kho giữ chỗ không hợp lệ, không thể hủy đơn.']);
                }

                $inventory->decrement('quantity_reserved', $item->quantity);
                InventoryTransaction::create([
                    'branch_id' => $inventory->branch_id,
                    'product_variant_id' => $inventory->product_variant_id,
                    'type' => 'cancel_release',
                    'quantity' => $item->quantity,
                    'quantity_before' => $inventory->quantity_on_hand,
                    'quantity_after' => $inventory->quantity_on_hand,
                    'reference_type' => Order::class,
                    'reference_id' => $order->id,
                    'performed_by' => $actorId,
                    'note' => $order->order_number,
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
        return Inventory::query()
            ->where('branch_id', $order->branch_id)
            ->where('product_variant_id', $variantId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function allowedTransitions(OrderStatus $status): array
    {
        return match ($status) {
            OrderStatus::Pending => [OrderStatus::Confirmed, OrderStatus::Cancelled],
            OrderStatus::Confirmed => [OrderStatus::Processing, OrderStatus::Cancelled],
            OrderStatus::Processing => [OrderStatus::Shipping, OrderStatus::Cancelled],
            OrderStatus::Shipping => [OrderStatus::Completed],
            OrderStatus::Completed, OrderStatus::Cancelled => [],
        };
    }
}
