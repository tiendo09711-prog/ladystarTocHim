<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Models\WarrantyRequest;

class AttentionCenterService
{
    public function summary(): array
    {
        $items = [
            ['key' => 'pending_orders', 'label' => 'Đơn hàng chờ xác nhận', 'count' => Order::where('order_status', 'pending')->count(), 'url' => '/admin/orders?status=pending'],
            ['key' => 'unpaid_bank_transfers', 'label' => 'Thanh toán cần kiểm tra', 'count' => Order::where('payment_method', 'bank_transfer')->where('payment_status', 'unpaid')->whereNotIn('order_status', ['cancelled', 'completed'])->count(), 'url' => '/admin/orders?payment_status=unpaid&payment_method=bank_transfer'],
            ['key' => 'shipments_pending', 'label' => 'Đơn cần xử lý vận chuyển', 'count' => Order::where('order_status', 'processing')->where(fn ($query) => $query->whereDoesntHave('shipment')->orWhereHas('shipment', fn ($shipment) => $shipment->where('status', 'pending')))->count(), 'url' => '/admin/orders?status=processing'],
            ['key' => 'returns_requested', 'label' => 'Yêu cầu đổi trả mới', 'count' => ReturnRequest::where('status', 'requested')->count(), 'url' => '/admin/returns?status=requested'],
            ['key' => 'warranties_requested', 'label' => 'Yêu cầu bảo hành mới', 'count' => WarrantyRequest::where('status', 'requested')->count(), 'url' => '/admin/warranties?status=requested'],
            ['key' => 'appointments_today', 'label' => 'Lịch hẹn hôm nay', 'count' => Appointment::whereDate('start_at', today())->whereIn('status', Appointment::ACTIVE_STATUSES)->count(), 'url' => '/admin/appointments?date='.today()->toDateString()],
            ['key' => 'low_stock', 'label' => 'SKU tồn kho thấp', 'count' => Inventory::whereRaw('(quantity_on_hand - quantity_reserved) <= reorder_level')->count(), 'url' => '/admin/inventory?low_stock=1'],
        ];

        return ['items' => $items, 'counters' => collect($items)->pluck('count', 'key')->all()];
    }
}
