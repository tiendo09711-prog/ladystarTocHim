<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Services\ReportingService;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    use ApiResponse;

    public function __construct(private ReportingService $reports) {}

    public function overview(Request $request)
    {
        return $this->success($this->reports->overview($this->filters($request)) + [
            'branches' => Branch::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function sales(Request $request)
    {
        return $this->success($this->reports->sales($this->filters($request)));
    }

    public function products(Request $request)
    {
        $filters = $this->filters($request) + $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'sort' => ['nullable', Rule::in(['quantity', 'revenue', 'profit', 'return_rate'])],
        ]);

        return $this->success($this->reports->products($filters, min(max($request->integer('per_page', 20), 1), 100)));
    }

    public function inventory(Request $request)
    {
        return $this->success($this->reports->inventory($this->filters($request), min(max($request->integer('per_page', 20), 1), 100)));
    }

    public function customers(Request $request)
    {
        $filters = $this->filters($request) + $request->validate([
            'search' => ['nullable', 'string', 'max:190'],
            'sort' => ['nullable', Rule::in(['net_spend', 'completed_orders', 'last_purchase'])],
        ]);

        return $this->success($this->reports->customers($filters, min(max($request->integer('per_page', 20), 1), 100)));
    }

    private function filters(Request $request): array
    {
        $data = $request->validate([
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
        ]);
        $from = CarbonImmutable::parse($data['date_from'] ?? now()->subDays(29)->toDateString())->startOfDay();
        $to = CarbonImmutable::parse($data['date_to'] ?? now()->toDateString())->endOfDay();
        if ($from->diffInDays($to) > 366) {
            throw ValidationException::withMessages(['date_to' => 'Khoảng thời gian báo cáo không được vượt quá 366 ngày.']);
        }

        return ['from' => $from, 'to' => $to, 'branch_id' => $data['branch_id'] ?? null];
    }
}
