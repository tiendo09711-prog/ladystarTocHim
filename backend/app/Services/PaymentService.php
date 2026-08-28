<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function createForOrder(Order $order): Payment
    {
        return $order->payment()->firstOrCreate([], [
            'method' => $order->payment_method,
            'provider' => 'manual',
            'amount' => $order->total_amount,
            'status' => $this->paymentStatus($order->payment_status),
        ]);
    }

    public function updateStatus(Order $order, string $orderPaymentStatus, int $actorId, ?string $transactionCode = null, ?string $note = null): Order
    {
        return DB::transaction(function () use ($order, $orderPaymentStatus, $actorId, $transactionCode, $note) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->getKey());
            $payment = Payment::query()->where('order_id', $lockedOrder->id)->lockForUpdate()->first()
                ?? $this->createForOrder($lockedOrder);
            $targetStatus = $this->paymentStatus($orderPaymentStatus);
            $updates = [
                'status' => $targetStatus,
                'method' => $lockedOrder->payment_method,
                'amount' => $lockedOrder->total_amount,
            ];

            if ($transactionCode !== null) {
                $updates['transaction_code'] = $transactionCode ?: null;
            }
            if ($note !== null) {
                $updates['note'] = $note ?: null;
            }
            if ($targetStatus === 'paid' && $payment->status !== 'paid') {
                $updates['paid_at'] = now();
                $updates['verified_by'] = $actorId;
            }
            if ($targetStatus === 'pending') {
                $updates['paid_at'] = null;
                $updates['verified_by'] = null;
            }

            $payment->update($updates);
            $lockedOrder->update(['payment_status' => $orderPaymentStatus]);

            return $lockedOrder->refresh()->load('payment', 'shipment', 'statusHistories');
        });
    }

    private function paymentStatus(string $orderPaymentStatus): string
    {
        return match ($orderPaymentStatus) {
            'paid' => 'paid',
            'refunded' => 'refunded',
            default => 'pending',
        };
    }
}
