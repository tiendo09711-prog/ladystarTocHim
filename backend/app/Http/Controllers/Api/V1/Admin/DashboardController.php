<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\ReportingService;
use App\Services\AttentionCenterService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use ApiResponse;

    public function __construct(private ReportingService $reports) {}

    public function summary()
    {
        $report = $this->reports->overview(['from' => now()->subDays(29)->startOfDay(), 'to' => now()->endOfDay(), 'branch_id' => null]);

        return $this->success([
            'revenue' => $report['net_revenue'],
            'gross_sales' => $report['gross_sales'],
            'refunds' => $report['refunds'],
            'net_revenue' => $report['net_revenue'],
            'orders' => Order::count(), 'customers' => User::where('role', 'user')->count(), 'products' => Product::count(),
            'average_order_value' => $report['aov_net'],
        ]);
    }

    public function revenue(Request $request)
    {
        $days = min(max($request->integer('days', 30), 7), 365);
        $rows = collect($this->reports->sales(['from' => now()->subDays($days - 1)->startOfDay(), 'to' => now()->endOfDay(), 'branch_id' => null])['data'])
            ->map(fn (array $row) => ['date' => $row['date'], 'revenue' => $row['net_revenue'], 'gross_sales' => $row['gross_sales'], 'refunds' => $row['refunds'], 'orders' => $row['completed_orders']]);

        return $this->success($rows);
    }

    public function orderStatuses()
    {
        return $this->success(Order::select('order_status', DB::raw('count(*) as total'))->groupBy('order_status')->get());
    }

    public function topProducts()
    {
        return $this->success(OrderItem::select('product_id', 'product_name', DB::raw('sum(quantity) as quantity'), DB::raw('sum(line_total) as revenue'))
            ->whereHas('order', fn ($query) => $query->where('order_status', OrderStatus::Completed->value))
            ->groupBy('product_id', 'product_name')->orderByDesc('quantity')->limit(10)->get());
    }

    public function lowStock()
    {
        return $this->success(Inventory::with('variant.product', 'branch')->whereRaw('(quantity_on_hand - quantity_reserved) <= reorder_level')->limit(20)->get());
    }

    public function attention(AttentionCenterService $attention)
    {
        return $this->success($attention->summary());
    }
}
