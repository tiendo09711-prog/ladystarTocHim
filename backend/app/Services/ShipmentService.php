<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Shipment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShipmentService
{
    public function __construct(private OrderLifecycleService $orderLifecycleService) {}

    public function save(Order $order, array $data, int $actorId): Order
    {
        return DB::transaction(function () use ($order, $data, $actorId) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->getKey());
            if (! in_array($lockedOrder->order_status, [OrderStatus::Confirmed->value, OrderStatus::Processing->value], true)) {
                throw ValidationException::withMessages(['shipment' => 'Chỉ có thể chuẩn bị vận chuyển cho đơn đã xác nhận hoặc đang chuẩn bị hàng.']);
            }
            $shipment = Shipment::query()->where('order_id', $lockedOrder->id)->lockForUpdate()->first();
            if ($shipment && $shipment->status !== 'pending') {
                throw ValidationException::withMessages(['shipment' => 'Không thể sửa vận chuyển đã bàn giao.']);
            }
            Shipment::query()->updateOrCreate(['order_id' => $lockedOrder->id], $data + [
                'status' => 'pending',
                'created_by' => $shipment?->created_by ?? $actorId,
            ]);

            return $lockedOrder->refresh()->load('payment', 'shipment', 'statusHistories');
        });
    }

    public function updateStatus(Order $order, string $targetStatus, int $actorId): Order
    {
        return DB::transaction(function () use ($order, $targetStatus, $actorId) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->getKey());
            $shipment = Shipment::query()->where('order_id', $lockedOrder->id)->lockForUpdate()->first();
            if (! $shipment) {
                throw ValidationException::withMessages(['shipment' => 'Chưa có thông tin vận chuyển.']);
            }
            if ($shipment->status === $targetStatus) {
                return $lockedOrder->refresh()->load('payment', 'shipment', 'statusHistories');
            }

            if ($targetStatus === 'shipped') {
                if ($shipment->status !== 'pending' || $lockedOrder->order_status !== OrderStatus::Processing->value || ! $shipment->carrier || ! $shipment->tracking_number) {
                    throw ValidationException::withMessages(['shipment' => 'Đơn phải đang chuẩn bị hàng và có đơn vị vận chuyển, mã vận đơn.']);
                }
                $shipment->update(['status' => 'shipped', 'shipped_at' => now()]);
                $this->orderLifecycleService->transition($lockedOrder, OrderStatus::Shipping, $actorId, [OrderStatus::Processing], 'Đã bàn giao cho đơn vị vận chuyển.');
            } elseif ($targetStatus === 'delivered') {
                if ($shipment->status !== 'shipped' || $lockedOrder->order_status !== OrderStatus::Shipping->value) {
                    throw ValidationException::withMessages(['shipment' => 'Chỉ có thể hoàn tất shipment đang giao.']);
                }
                $shipment->update(['status' => 'delivered', 'delivered_at' => now()]);
                $this->orderLifecycleService->transition($lockedOrder, OrderStatus::Completed, $actorId, [OrderStatus::Shipping], 'Giao hàng thành công.');
            } else {
                throw ValidationException::withMessages(['status' => 'Trạng thái vận chuyển không hợp lệ.']);
            }

            return $lockedOrder->refresh()->load('payment', 'shipment', 'statusHistories');
        });
    }
}
