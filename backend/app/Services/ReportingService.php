<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ReportingService
{
    public function overview(array $filters): array
    {
        $orders = $this->completedOrders($filters);
        $orderTotals = (clone $orders)->selectRaw('COUNT(*) as completed_orders, COALESCE(SUM(total_amount), 0) as gross_sales, COALESCE(SUM(subtotal), 0) as subtotal, COALESCE(SUM(discount_amount), 0) as discounts, COALESCE(SUM(shipping_fee), 0) as shipping_charged')->first();
        $refunds = $this->completedRefunds($filters)->sum('r.amount');
        $cancelled = DB::table('orders as o')->where('o.order_status', 'cancelled')
            ->whereBetween('o.cancelled_at', [$filters['from'], $filters['to']]);
        $this->branch($cancelled, $filters, 'o.branch_id');
        $soldQuantity = (clone $orders)->join('order_items as oi', 'oi.order_id', '=', 'o.id')->sum('oi.quantity');
        $returnBase = DB::table('return_items as ri')->join('return_requests as rr', 'rr.id', '=', 'ri.return_request_id')
            ->join('orders as ro', 'ro.id', '=', 'rr.order_id')->where('rr.status', 'completed')
            ->whereBetween('rr.completed_at', [$filters['from'], $filters['to']]);
        $this->branch($returnBase, $filters, 'ro.branch_id');
        $returnedQuantity = (int) (clone $returnBase)->sum('ri.quantity');
        $cost = $this->costSummary($filters);

        $grossMinor = $this->minor($orderTotals->gross_sales);
        $refundMinor = $this->minor($refunds);
        $netMinor = $grossMinor - $refundMinor;
        $netCogsMinor = $this->minor($cost['gross_cogs']) - $this->minor($cost['recovered_cogs']);
        $profitMinor = $netMinor - $netCogsMinor;
        $completedOrders = (int) $orderTotals->completed_orders;

        return [
            'period' => $this->period($filters),
            'gross_sales' => $this->money($grossMinor),
            'refunds' => $this->money($refundMinor),
            'net_revenue' => $this->money($netMinor),
            'subtotal' => (float) $orderTotals->subtotal,
            'discounts' => (float) $orderTotals->discounts,
            'shipping_charged' => (float) $orderTotals->shipping_charged,
            'completed_orders' => $completedOrders,
            'cancelled_orders' => (int) $cancelled->count(),
            'aov_gross' => $completedOrders ? $this->money((int) round($grossMinor / $completedOrders)) : 0.0,
            'aov_net' => $completedOrders ? $this->money((int) round($netMinor / $completedOrders)) : 0.0,
            'new_customers' => User::where('role', 'user')->whereBetween('created_at', [$filters['from'], $filters['to']])->count(),
            'returned_quantity' => $returnedQuantity,
            'return_rate' => $soldQuantity > 0 ? round($returnedQuantity / $soldQuantity, 4) : 0.0,
            'gross_cogs' => (float) $cost['gross_cogs'],
            'recovered_cogs' => (float) $cost['recovered_cogs'],
            'net_cogs' => $this->money($netCogsMinor),
            'gross_profit_estimate' => $this->money($profitMinor),
            'gross_margin_estimate' => $netMinor > 0 ? round($profitMinor / $netMinor, 4) : 0.0,
            'cost_data_quality' => $cost['quality'],
        ];
    }

    public function sales(array $filters): array
    {
        $dateSql = DB::connection()->getDriverName() === 'sqlite' ? 'date(%s)' : 'DATE(%s)';
        $sales = $this->completedOrders($filters)
            ->selectRaw(sprintf($dateSql, 'o.completed_at').' as report_date, SUM(o.total_amount) as gross_sales, COUNT(*) as completed_orders')
            ->groupBy('report_date')->get()->keyBy('report_date');
        $refunds = $this->completedRefunds($filters)
            ->selectRaw(sprintf($dateSql, 'r.completed_at').' as report_date, SUM(r.amount) as refunds')
            ->groupBy('report_date')->get()->keyBy('report_date');

        $rows = [];
        for ($date = CarbonImmutable::parse($filters['from'])->startOfDay(); $date->lte(CarbonImmutable::parse($filters['to'])->startOfDay()); $date = $date->addDay()) {
            $key = $date->toDateString();
            $grossMinor = $this->minor($sales->get($key)?->gross_sales ?? 0);
            $refundMinor = $this->minor($refunds->get($key)?->refunds ?? 0);
            $rows[] = [
                'date' => $key,
                'gross_sales' => $this->money($grossMinor),
                'refunds' => $this->money($refundMinor),
                'net_revenue' => $this->money($grossMinor - $refundMinor),
                'completed_orders' => (int) ($sales->get($key)?->completed_orders ?? 0),
            ];
        }

        return ['period' => $this->period($filters), 'data' => $rows];
    }

    public function products(array $filters, int $perPage = 20): array
    {
        $returns = DB::table('return_items as ri')->join('return_requests as rr', 'rr.id', '=', 'ri.return_request_id')
            ->join('orders as ro', 'ro.id', '=', 'rr.order_id')->join('order_items as roi', 'roi.id', '=', 'ri.order_item_id')
            ->where('rr.status', 'completed')->whereBetween('rr.completed_at', [$filters['from'], $filters['to']])
            ->selectRaw('roi.product_id, SUM(ri.quantity) as returned_quantity')->groupBy('roi.product_id');
        $this->branch($returns, $filters, 'ro.branch_id');

        $query = DB::table('order_items as oi')->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->join('products as p', 'p.id', '=', 'oi.product_id')->leftJoin('product_variants as pv', 'pv.id', '=', 'oi.product_variant_id')
            ->leftJoinSub($returns, 'ret', 'ret.product_id', '=', 'oi.product_id')
            ->where('o.order_status', 'completed')->whereBetween('o.completed_at', [$filters['from'], $filters['to']])
            ->selectRaw('oi.product_id, p.name as product_name, SUM(oi.quantity) as quantity_sold, SUM(oi.line_total) as gross_revenue, COALESCE(MAX(ret.returned_quantity), 0) as completed_return_quantity, SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, pv.cost_price, 0)) as estimated_cogs, MAX(o.completed_at) as last_sold_at')
            ->groupBy('oi.product_id', 'p.name');
        $this->branch($query, $filters, 'o.branch_id');
        if (! empty($filters['category_id'])) {
            $query->where('p.category_id', $filters['category_id']);
        }
        if (! empty($filters['brand_id'])) {
            $query->where('p.brand_id', $filters['brand_id']);
        }

        $sort = $filters['sort'] ?? 'revenue';
        match ($sort) {
            'quantity' => $query->orderByDesc('quantity_sold'),
            'profit' => $query->orderByRaw('(SUM(oi.line_total) - SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, pv.cost_price, 0))) DESC'),
            'return_rate' => $query->orderByRaw('(COALESCE(MAX(ret.returned_quantity), 0) * 1.0 / NULLIF(SUM(oi.quantity), 0)) DESC'),
            default => $query->orderByDesc('gross_revenue'),
        };

        $paginator = $query->paginate($perPage);
        $paginator->setCollection($paginator->getCollection()->map(function ($row) {
            $revenueMinor = $this->minor($row->gross_revenue);
            $cogsMinor = $this->minor($row->estimated_cogs);
            $profitMinor = $revenueMinor - $cogsMinor;
            $quantity = (int) $row->quantity_sold;
            $returned = (int) $row->completed_return_quantity;

            return [
                'product_id' => (int) $row->product_id, 'product_name' => $row->product_name,
                'quantity_sold' => $quantity, 'gross_revenue' => $this->money($revenueMinor),
                'completed_return_quantity' => $returned, 'return_rate' => $quantity ? round($returned / $quantity, 4) : 0.0,
                'estimated_cogs' => $this->money($cogsMinor), 'estimated_profit' => $this->money($profitMinor),
                'estimated_margin' => $revenueMinor > 0 ? round($profitMinor / $revenueMinor, 4) : 0.0,
                'last_sold_at' => $row->last_sold_at,
            ];
        }));

        return ['period' => $this->period($filters), 'rows' => $paginator, 'cost_data_quality' => $this->costSummary($filters)['quality']];
    }

    public function inventory(array $filters, int $perPage = 20): array
    {
        $cut30 = now()->subDays(30);
        $cut60 = now()->subDays(60);
        $cut90 = now()->subDays(90);
        $sales = DB::table('order_items as oi')->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->where('o.order_status', 'completed')->where('o.completed_at', '>=', $cut90)
            ->selectRaw('oi.product_variant_id, o.branch_id, SUM(CASE WHEN o.completed_at >= ? THEN oi.quantity ELSE 0 END) as sold_30d, SUM(CASE WHEN o.completed_at >= ? THEN oi.quantity ELSE 0 END) as sold_60d, SUM(oi.quantity) as sold_90d, MAX(o.completed_at) as last_sold_at', [$cut30, $cut60])
            ->groupBy('oi.product_variant_id', 'o.branch_id');

        $base = DB::table('inventories as i')->join('product_variants as pv', 'pv.id', '=', 'i.product_variant_id')
            ->join('products as p', 'p.id', '=', 'pv.product_id')->join('branches as b', 'b.id', '=', 'i.branch_id')
            ->leftJoinSub($sales, 'sales', function ($join) {
                $join->on('sales.product_variant_id', '=', 'i.product_variant_id')->on('sales.branch_id', '=', 'i.branch_id');
            });
        $this->branch($base, $filters, 'i.branch_id');

        $summaryQuery = clone $base;
        $deadBefore = now()->subDays(max(1, (int) config('analytics.dead_stock_days', 90)));
        $summary = $summaryQuery->selectRaw('COALESCE(SUM(CASE WHEN pv.cost_price IS NOT NULL THEN i.quantity_on_hand * pv.cost_price ELSE 0 END), 0) as inventory_value, SUM(CASE WHEN pv.cost_price IS NULL AND i.quantity_on_hand > 0 THEN 1 ELSE 0 END) as unknown_cost_items, SUM(CASE WHEN (i.quantity_on_hand - i.quantity_reserved) <= i.reorder_level THEN 1 ELSE 0 END) as low_stock_items, SUM(CASE WHEN (i.quantity_on_hand - i.quantity_reserved) <= 0 THEN 1 ELSE 0 END) as out_of_stock_items, SUM(CASE WHEN i.quantity_on_hand > 0 AND (sales.last_sold_at IS NULL OR sales.last_sold_at <= ?) THEN 1 ELSE 0 END) as dead_stock_items', [$deadBefore])->first();

        $rows = $base->selectRaw('i.id, pv.id as variant_id, pv.sku, p.id as product_id, p.name as product_name, b.id as branch_id, b.name as branch_name, i.quantity_on_hand, i.quantity_reserved, (i.quantity_on_hand - i.quantity_reserved) as quantity_available, i.reorder_level, pv.cost_price, CASE WHEN pv.cost_price IS NULL THEN NULL ELSE i.quantity_on_hand * pv.cost_price END as inventory_value, COALESCE(sales.sold_30d, 0) as sold_30d, COALESCE(sales.sold_60d, 0) as sold_60d, COALESCE(sales.sold_90d, 0) as sold_90d, sales.last_sold_at')
            ->orderBy('p.name')->orderBy('pv.sku')->paginate($perPage);
        $rows->setCollection($rows->getCollection()->map(fn ($row) => (array) $row + [
            'is_dead_stock' => (int) $row->quantity_on_hand > 0 && (! $row->last_sold_at || CarbonImmutable::parse($row->last_sold_at)->lte($deadBefore)),
        ]));

        return [
            'summary' => [
                'inventory_value' => (float) $summary->inventory_value,
                'unknown_cost_items' => (int) $summary->unknown_cost_items,
                'low_stock_items' => (int) $summary->low_stock_items,
                'out_of_stock_items' => (int) $summary->out_of_stock_items,
                'dead_stock_items' => (int) $summary->dead_stock_items,
                'dead_stock_days' => (int) config('analytics.dead_stock_days', 90),
            ],
            'rows' => $rows,
        ];
    }

    public function customers(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $orders = DB::table('orders')->where('order_status', 'completed')->whereBetween('completed_at', [$filters['from'], $filters['to']])
            ->selectRaw('user_id, COUNT(*) as completed_orders, SUM(total_amount) as gross_spend, MIN(completed_at) as first_purchase_at, MAX(completed_at) as last_purchase_at')->groupBy('user_id');
        $refunds = DB::table('refunds as r')->join('orders as o', 'o.id', '=', 'r.order_id')->where('r.status', 'completed')->whereBetween('r.completed_at', [$filters['from'], $filters['to']])
            ->selectRaw('o.user_id, SUM(r.amount) as completed_refunds')->groupBy('o.user_id');
        $returns = DB::table('return_requests as rr')->leftJoin('return_items as ri', 'ri.return_request_id', '=', 'rr.id')->where('rr.status', 'completed')->whereBetween('rr.completed_at', [$filters['from'], $filters['to']])
            ->selectRaw('rr.user_id, COUNT(DISTINCT rr.id) as completed_return_requests, COALESCE(SUM(ri.quantity), 0) as returned_quantity')->groupBy('rr.user_id');
        $warranties = DB::table('warranty_requests')->whereBetween('requested_at', [$filters['from'], $filters['to']])->selectRaw('user_id, COUNT(*) as warranty_count')->groupBy('user_id');
        $appointments = DB::table('appointments')->whereBetween('start_at', [$filters['from'], $filters['to']])->selectRaw('user_id, COUNT(*) as appointment_count')->groupBy('user_id');

        $query = DB::table('users as u')->leftJoinSub($orders, 'sales', 'sales.user_id', '=', 'u.id')
            ->leftJoinSub($refunds, 'refunds', 'refunds.user_id', '=', 'u.id')->leftJoinSub($returns, 'returns', 'returns.user_id', '=', 'u.id')
            ->leftJoinSub($warranties, 'warranties', 'warranties.user_id', '=', 'u.id')->leftJoinSub($appointments, 'appointments', 'appointments.user_id', '=', 'u.id')
            ->where('u.role', 'user')
            ->selectRaw('u.id, u.name, u.email, u.phone, COALESCE(sales.completed_orders, 0) as completed_orders, COALESCE(sales.gross_spend, 0) as gross_spend, COALESCE(refunds.completed_refunds, 0) as completed_refunds, sales.first_purchase_at, sales.last_purchase_at, COALESCE(returns.completed_return_requests, 0) as completed_return_requests, COALESCE(returns.returned_quantity, 0) as returned_quantity, COALESCE(warranties.warranty_count, 0) as warranty_count, COALESCE(appointments.appointment_count, 0) as appointment_count');
        if (! empty($filters['search'])) {
            $search = '%'.$filters['search'].'%';
            $query->where(fn ($q) => $q->where('u.name', 'like', $search)->orWhere('u.email', 'like', $search)->orWhere('u.phone', 'like', $search));
        }
        match ($filters['sort'] ?? 'net_spend') {
            'completed_orders' => $query->orderByDesc('completed_orders'),
            'last_purchase' => $query->orderByDesc('last_purchase_at'),
            default => $query->orderByRaw('(COALESCE(sales.gross_spend, 0) - COALESCE(refunds.completed_refunds, 0)) DESC'),
        };

        $rows = $query->paginate($perPage);
        $rows->setCollection($rows->getCollection()->map(function ($row) {
            $grossMinor = $this->minor($row->gross_spend);
            $refundMinor = $this->minor($row->completed_refunds);
            $orders = (int) $row->completed_orders;

            return (array) $row + [
                'gross_spend' => $this->money($grossMinor),
                'completed_refunds' => $this->money($refundMinor),
                'net_spend' => $this->money($grossMinor - $refundMinor),
                'aov_net' => $orders ? $this->money((int) round(($grossMinor - $refundMinor) / $orders)) : 0.0,
            ];
        }));

        return $rows;
    }

    public function customerInsight(User $customer): array
    {
        $filters = ['from' => CarbonImmutable::create(2000)->startOfDay(), 'to' => now()->endOfDay(), 'search' => $customer->email];
        $row = $this->customers($filters, 1)->getCollection()->first();

        return $row ? (array) $row : [];
    }

    private function completedOrders(array $filters): Builder
    {
        $query = DB::table('orders as o')->where('o.order_status', 'completed')->whereBetween('o.completed_at', [$filters['from'], $filters['to']]);
        $this->branch($query, $filters, 'o.branch_id');

        return $query;
    }

    private function completedRefunds(array $filters): Builder
    {
        $query = DB::table('refunds as r')->join('orders as o', 'o.id', '=', 'r.order_id')
            ->where('r.status', 'completed')->whereBetween('r.completed_at', [$filters['from'], $filters['to']]);
        $this->branch($query, $filters, 'o.branch_id');

        return $query;
    }

    private function costSummary(array $filters): array
    {
        $query = DB::table('order_items as oi')->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->leftJoin('product_variants as pv', 'pv.id', '=', 'oi.product_variant_id')
            ->where('o.order_status', 'completed')->whereBetween('o.completed_at', [$filters['from'], $filters['to']]);
        $this->branch($query, $filters, 'o.branch_id');
        $cost = $query->selectRaw('COALESCE(SUM(oi.quantity * COALESCE(oi.cost_price_snapshot, pv.cost_price, 0)), 0) as gross_cogs, SUM(CASE WHEN oi.cost_price_snapshot IS NOT NULL THEN 1 ELSE 0 END) as snapshot_items, SUM(CASE WHEN oi.cost_price_snapshot IS NULL AND pv.cost_price IS NOT NULL THEN 1 ELSE 0 END) as fallback_items, SUM(CASE WHEN oi.cost_price_snapshot IS NULL AND pv.cost_price IS NULL THEN 1 ELSE 0 END) as missing_items')->first();

        $recovered = DB::table('return_items as ri')->join('return_requests as rr', 'rr.id', '=', 'ri.return_request_id')
            ->join('orders as o', 'o.id', '=', 'rr.order_id')->join('order_items as oi', 'oi.id', '=', 'ri.order_item_id')
            ->leftJoin('product_variants as pv', 'pv.id', '=', 'oi.product_variant_id')
            ->where('rr.status', 'completed')->where('ri.restockable', true)->whereNotNull('ri.restocked_at')
            ->whereBetween('rr.completed_at', [$filters['from'], $filters['to']]);
        $this->branch($recovered, $filters, 'o.branch_id');

        return [
            'gross_cogs' => $cost->gross_cogs,
            'recovered_cogs' => $recovered->sum(DB::raw('ri.quantity * COALESCE(oi.cost_price_snapshot, pv.cost_price, 0)')),
            'quality' => [
                'snapshot_items' => (int) $cost->snapshot_items,
                'fallback_items' => (int) $cost->fallback_items,
                'missing_items' => (int) $cost->missing_items,
            ],
        ];
    }

    private function branch(Builder $query, array $filters, string $column): void
    {
        if (! empty($filters['branch_id'])) {
            $query->where($column, $filters['branch_id']);
        }
    }

    private function period(array $filters): array
    {
        return ['date_from' => CarbonImmutable::parse($filters['from'])->toDateString(), 'date_to' => CarbonImmutable::parse($filters['to'])->toDateString(), 'branch_id' => $filters['branch_id'] ?? null];
    }

    private function minor(mixed $value): int
    {
        return (int) round((float) $value * 100);
    }

    private function money(int $minor): float
    {
        return round($minor / 100, 2);
    }
}
