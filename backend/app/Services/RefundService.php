<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\ReturnRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RefundService
{
    public function __construct(private RefundCalculatorService $calculator) {}

    public function create(Payment $payment, array $data, int $actorId, ?ReturnRequest $return = null, string $source = 'return'): Refund
    {
        return DB::transaction(function () use ($payment, $data, $actorId, $return, $source) {
            $locked = Payment::with('order')->lockForUpdate()->findOrFail($payment->id);
            if (! in_array($locked->status, ['paid', 'partially_refunded', 'refunded'], true)) {
                throw ValidationException::withMessages(['payment' => 'Only a paid payment can be refunded.']);
            }
            $amount = $this->minor($data['amount']);
            $remaining = $this->minor($this->remainingRefundableAmount($locked, true));
            if ($amount <= 0 || $amount > $remaining) {
                throw ValidationException::withMessages(['amount' => 'Refund amount exceeds the remaining refundable amount.']);
            }
            if ($return) {
                $lockedReturn = ReturnRequest::lockForUpdate()->findOrFail($return->id);
                if (! in_array($lockedReturn->status, ['received', 'completed'], true)) {
                    throw ValidationException::withMessages(['return_request' => 'Returned goods must be received before refunding.']);
                }
                $already = $this->minor($lockedReturn->refunds()->whereIn('status', ['pending', 'completed'])->sum('amount'));
                $suggested = $this->minor($this->calculator->suggestedForReturn($lockedReturn));
                if ($amount > max(0, $suggested - $already)) {
                    throw ValidationException::withMessages(['amount' => 'Refund amount exceeds this return request allowance.']);
                }
            }

            return Refund::create([
                'code' => $this->uniqueCode(), 'order_id' => $locked->order_id, 'payment_id' => $locked->id,
                'return_request_id' => $return?->id, 'amount' => $this->decimal($amount), 'status' => 'pending',
                'source' => $source,
                'method' => $data['method'], 'transaction_code' => $data['transaction_code'] ?? null,
                'reason' => $data['reason'] ?? null, 'admin_note' => $data['admin_note'] ?? null,
                'requested_at' => now(), 'processed_by' => $actorId,
            ]);
        });
    }

    public function createForCancellation(Order $order, int $actorId, ?string $reason = null): Refund
    {
        return DB::transaction(function () use ($order, $actorId, $reason) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            $payment = Payment::query()->where('order_id', $lockedOrder->id)->lockForUpdate()->first();
            if (! $payment || $payment->status !== 'paid') {
                throw ValidationException::withMessages(['payment' => 'Only a paid order requires a cancellation refund.']);
            }

            $existing = Refund::query()
                ->where('order_id', $lockedOrder->id)
                ->where('source', 'order_cancellation')
                ->whereIn('status', ['pending', 'completed'])
                ->lockForUpdate()
                ->first();
            if ($existing) {
                return $existing;
            }

            $amount = $this->minor($this->remainingRefundableAmount($payment, true));
            if ($amount <= 0) {
                throw ValidationException::withMessages(['amount' => 'No refundable payment amount remains.']);
            }

            return Refund::create([
                'code' => $this->uniqueCode(),
                'order_id' => $lockedOrder->id,
                'payment_id' => $payment->id,
                'return_request_id' => null,
                'source' => 'order_cancellation',
                'amount' => $this->decimal($amount),
                'status' => 'pending',
                'method' => $payment->method === 'cod' ? 'cash' : 'manual_bank_transfer',
                'reason' => $reason ?: 'Paid order cancellation',
                'requested_at' => now(),
                'processed_by' => $actorId,
            ]);
        });
    }

    public function complete(Refund $refund, int $actorId, ?string $transactionCode = null): Refund
    {
        return DB::transaction(function () use ($refund, $actorId, $transactionCode) {
            $lockedRefund = Refund::lockForUpdate()->findOrFail($refund->id);
            $payment = Payment::with('order')->lockForUpdate()->findOrFail($lockedRefund->payment_id);
            if ($lockedRefund->status === 'completed') {
                return $lockedRefund;
            }
            if ($lockedRefund->status !== 'pending') {
                throw ValidationException::withMessages(['status' => 'Only pending refunds can be completed.']);
            }
            $completed = $this->minor($payment->refunds()->where('status', 'completed')->sum('amount'));
            if ($completed + $this->minor($lockedRefund->amount) > $this->minor($payment->amount)) {
                throw ValidationException::withMessages(['amount' => 'Refund would exceed the payment amount.']);
            }
            $lockedRefund->update(['status' => 'completed', 'completed_at' => now(), 'processed_by' => $actorId, 'transaction_code' => $transactionCode ?? $lockedRefund->transaction_code]);
            $this->syncPaymentStatus($payment);

            return $lockedRefund->refresh();
        });
    }

    public function cancel(Refund $refund, int $actorId): Refund
    {
        return DB::transaction(function () use ($refund, $actorId) {
            $locked = Refund::lockForUpdate()->findOrFail($refund->id);
            if ($locked->source === 'order_cancellation') {
                throw ValidationException::withMessages([
                    'status' => 'Refunds created for paid order cancellations cannot be cancelled.',
                ]);
            }
            if ($locked->status === 'cancelled') {
                return $locked;
            }
            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages(['status' => 'Only pending refunds can be cancelled.']);
            }
            $locked->update(['status' => 'cancelled', 'cancelled_at' => now(), 'processed_by' => $actorId]);

            return $locked->refresh();
        });
    }

    public function remainingRefundableAmount(Payment $payment, bool $includePending = false): float
    {
        $statuses = $includePending ? ['pending', 'completed'] : ['completed'];

        return max(0, (float) $payment->amount - (float) $payment->refunds()->whereIn('status', $statuses)->sum('amount'));
    }

    private function syncPaymentStatus(Payment $payment): void
    {
        $completed = $this->minor($payment->refunds()->where('status', 'completed')->sum('amount'));
        $amount = $this->minor($payment->amount);
        $status = $completed === 0 ? 'paid' : ($completed < $amount ? 'partially_refunded' : 'refunded');
        $payment->update(['status' => $status]);
        $payment->order()->update(['payment_status' => $status]);
    }

    private function uniqueCode(): string
    {
        do {
            $code = 'RF-'.now()->format('ymd').'-'.strtoupper(Str::random(6));
        } while (Refund::where('code', $code)->exists());

        return $code;
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
