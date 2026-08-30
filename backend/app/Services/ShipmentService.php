<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Shipment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShipmentService
{
    public function __construct(private OrderLifecycleService $orderLifecycleService, private PaymentService $paymentService) {}

    public function save(Order $order, array $data, int $actorId): Order
    {
        return DB::transaction(function () use ($order, $data, $actorId) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->getKey());
            if (! in_array($lockedOrder->order_status, [OrderStatus::Confirmed->value, OrderStatus::Processing->value], true)) {
                throw ValidationException::withMessages(['shipment' => 'Shipment can only be prepared for a confirmed or processing order.']);
            }
            $shipment = Shipment::query()->where('order_id', $lockedOrder->id)->lockForUpdate()->first();
            if ($shipment && $shipment->status !== 'pending') {
                throw ValidationException::withMessages(['shipment' => 'A dispatched shipment cannot be edited.']);
            }
            Shipment::query()->updateOrCreate(['order_id' => $lockedOrder->id], $data + [
                'status' => 'pending',
                'created_by' => $shipment?->created_by ?? $actorId,
            ]);

            return $lockedOrder->refresh()->load('payment', 'shipment', 'statusHistories');
        });
    }

    public function updateStatus(Order $order, string $targetStatus, int $actorId, ?string $reason = null): Order
    {
        return DB::transaction(function () use ($order, $targetStatus, $actorId, $reason) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->getKey());
            $shipment = Shipment::query()->where('order_id', $lockedOrder->id)->lockForUpdate()->first();
            if (! $shipment) {
                throw ValidationException::withMessages(['shipment' => 'Shipment information is missing.']);
            }
            if ($shipment->status === $targetStatus) {
                return $lockedOrder->refresh()->load('payment', 'shipment', 'statusHistories');
            }

            if ($targetStatus === 'shipped') {
                $validOrderStatus = in_array($lockedOrder->order_status, [OrderStatus::Processing->value, OrderStatus::Shipping->value], true);
                if (! in_array($shipment->status, ['pending', 'delivery_failed'], true) || ! $validOrderStatus || ! $shipment->carrier || ! $shipment->tracking_number) {
                    throw ValidationException::withMessages(['shipment' => 'Shipment requires a valid order state, carrier and tracking number.']);
                }
                $shipment->update(['status' => 'shipped', 'shipped_at' => now(), 'failed_at' => null, 'failure_reason' => null]);
                if ($lockedOrder->order_status === OrderStatus::Processing->value) {
                    $this->orderLifecycleService->transition($lockedOrder, OrderStatus::Shipping, $actorId, [OrderStatus::Processing], 'Shipment dispatched.');
                }
            } elseif ($targetStatus === 'delivered') {
                if ($shipment->status !== 'shipped' || $lockedOrder->order_status !== OrderStatus::Shipping->value) {
                    throw ValidationException::withMessages(['shipment' => 'Only an actively shipped order can be delivered.']);
                }
                if ($lockedOrder->payment_method === 'cod' && $lockedOrder->payment_status !== 'paid') {
                    throw ValidationException::withMessages(['payment' => 'Confirm COD collection before completing delivery.']);
                }
                if ($lockedOrder->payment_method !== 'cod' && $lockedOrder->payment_status !== 'paid') {
                    throw ValidationException::withMessages(['payment' => 'Bank transfer orders must be paid before delivery completion.']);
                }
                $shipment->update(['status' => 'delivered', 'delivered_at' => now()]);
                $this->orderLifecycleService->transition($lockedOrder, OrderStatus::Completed, $actorId, [OrderStatus::Shipping], 'Delivery completed.');
            } elseif ($targetStatus === 'delivery_failed') {
                if ($shipment->status !== 'shipped' || $lockedOrder->order_status !== OrderStatus::Shipping->value) {
                    throw ValidationException::withMessages(['shipment' => 'Only a shipped shipment can be marked delivery failed.']);
                }
                $shipment->update(['status' => 'delivery_failed', 'failed_at' => now(), 'failure_reason' => $reason]);
            } elseif ($targetStatus === 'returned') {
                if ($shipment->status !== 'delivery_failed' || $lockedOrder->order_status !== OrderStatus::Shipping->value) {
                    throw ValidationException::withMessages(['shipment' => 'Only a failed delivery can be returned.']);
                }
                $shipment->update(['status' => 'returned', 'returned_at' => now(), 'return_reason' => $reason]);
                $this->orderLifecycleService->cancel($lockedOrder, $actorId, [OrderStatus::Shipping], trim('Shipment returned to sender. '.($reason ?? '')));
            } else {
                throw ValidationException::withMessages(['status' => 'Invalid shipment status.']);
            }

            return $lockedOrder->refresh()->load('payment', 'shipment', 'statusHistories', 'refunds');
        });
    }

    public function confirmCodDelivered(Order $order, int $actorId, ?string $transactionCode = null, ?string $note = null): Order
    {
        return DB::transaction(function () use ($order, $actorId, $transactionCode, $note) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            if ($lockedOrder->payment_method !== 'cod') {
                throw ValidationException::withMessages(['payment_method' => 'This action is only available for COD orders.']);
            }
            $shipment = Shipment::query()->where('order_id', $lockedOrder->id)->lockForUpdate()->firstOrFail();
            if ($shipment->status === 'delivered' && $lockedOrder->order_status === OrderStatus::Completed->value && $lockedOrder->payment_status === 'paid') {
                return $lockedOrder->refresh()->load('payment', 'shipment', 'statusHistories');
            }
            if ($shipment->status !== 'shipped' || $lockedOrder->order_status !== OrderStatus::Shipping->value) {
                throw ValidationException::withMessages(['shipment' => 'COD order must be actively shipping.']);
            }

            $this->paymentService->updateStatus($lockedOrder, 'paid', $actorId, $transactionCode, $note);
            $shipment->update(['status' => 'delivered', 'delivered_at' => now()]);
            $this->orderLifecycleService->transition($lockedOrder->refresh(), OrderStatus::Completed, $actorId, [OrderStatus::Shipping], 'Delivery confirmed and COD collected.');

            return $lockedOrder->refresh()->load('payment', 'shipment', 'statusHistories');
        });
    }
}
