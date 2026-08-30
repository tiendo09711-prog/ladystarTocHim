<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Services\OrderLifecycleService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

class ExpirePendingOrders extends Command
{
    protected $signature = 'orders:expire-pending';

    protected $description = 'Cancel unpaid pending orders after their reservation expires';

    public function handle(OrderLifecycleService $orderLifecycleService): int
    {
        $expired = 0;

        Order::query()
            ->where('order_status', OrderStatus::Pending->value)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->where('payment_status', '!=', 'paid')
            ->whereDoesntHave('payment', fn ($query) => $query->where('status', 'paid'))
            ->orderBy('id')
            ->chunkById(100, function ($orders) use ($orderLifecycleService, &$expired) {
                foreach ($orders as $order) {
                    try {
                        $result = $orderLifecycleService->expirePending($order);
                        if ($result?->order_status === OrderStatus::Cancelled->value) {
                            $expired++;
                        }
                    } catch (ValidationException) {
                        continue;
                    }
                }
            });

        $this->info('Expired '.$expired.' pending order(s).');

        return self::SUCCESS;
    }
}
