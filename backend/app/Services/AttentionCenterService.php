<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\WarrantyRequest;
use App\Models\User;

class AttentionCenterService
{
    public function summary(User $actor): array
    {
        $items = [
            ['permission' => 'orders.view', 'key' => 'pending_orders', 'label' => 'Đơn hàng chờ xác nhận', 'count' => fn () => Order::where('order_status', 'pending')->count(), 'url' => '/admin/orders?status=pending'],
            ['permission' => 'orders.payment.manage', 'key' => 'unpaid_bank_transfers', 'label' => 'Thanh toán cần kiểm tra', 'count' => fn () => Order::where('payment_method', 'bank_transfer')->where('payment_status', 'unpaid')->whereNotIn('order_status', ['cancelled', 'completed'])->count(), 'url' => '/admin/orders?payment_status=unpaid&payment_method=bank_transfer'],
            ['permission' => 'orders.shipment.manage', 'key' => 'shipments_pending', 'label' => 'Đơn cần xử lý vận chuyển', 'count' => fn () => Order::where('order_status', 'processing')->where(fn ($query) => $query->whereDoesntHave('shipment')->orWhereHas('shipment', fn ($shipment) => $shipment->where('status', 'pending')))->count(), 'url' => '/admin/orders?status=processing'],
            ['permission' => 'returns.view', 'key' => 'returns_requested', 'label' => 'Yêu cầu đổi trả mới', 'count' => fn () => ReturnRequest::where('status', 'requested')->count(), 'url' => '/admin/returns?status=requested'],
            ['permission' => 'warranties.view', 'key' => 'warranties_requested', 'label' => 'Yêu cầu bảo hành mới', 'count' => fn () => WarrantyRequest::where('status', 'requested')->count(), 'url' => '/admin/warranties?status=requested'],
            ['permission' => 'appointments.view', 'key' => 'appointments_today', 'label' => 'Lịch hẹn hôm nay', 'count' => fn () => Appointment::whereDate('start_at', today())->whereIn('status', Appointment::ACTIVE_STATUSES)->count(), 'url' => '/admin/appointments?date='.today()->toDateString()],
            ['permission' => 'inventory.view', 'key' => 'low_stock', 'label' => 'SKU tồn kho thấp', 'count' => fn () => Inventory::whereRaw('(quantity_on_hand - quantity_reserved) <= reorder_level')->count(), 'url' => '/admin/inventory?low_stock=1'],
        ];
        $items = collect($items)->filter(fn ($item) => $actor->hasPermission($item['permission']))->map(function ($item) {
            $item['count'] = $item['count']();
            unset($item['permission']);

            return $item;
        })->values();

        return ['items' => $items->all(), 'counters' => $items->pluck('count', 'key')->all()];
    }
}
