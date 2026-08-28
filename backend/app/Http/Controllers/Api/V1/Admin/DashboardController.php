<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use ApiResponse;

    public function summary()
    {
        return $this->success([
            'revenue' => (float) Order::where('order_status', 'completed')->sum('total_amount'),
            'orders' => Order::count(), 'customers' => User::where('role', 'user')->count(), 'products' => Product::count(),
            'average_order_value' => (float) (Order::where('order_status', 'completed')->avg('total_amount') ?? 0),
        ]);
    }

    public function revenue(Request $request)
    {
        $days = min(max($request->integer('days', 30), 7), 365);
        $driver = DB::connection()->getDriverName();
        $dateSql = $driver === 'sqlite' ? 'date(created_at)' : 'DATE(created_at)';
        $rows = Order::selectRaw("{$dateSql} as date, sum(total_amount) as revenue, count(*) as orders")
            ->where('order_status', 'completed')->where('created_at', '>=', now()->subDays($days))->groupBy('date')->orderBy('date')->get();

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
}
