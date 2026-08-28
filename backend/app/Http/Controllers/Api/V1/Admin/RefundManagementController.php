<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Refund;
use App\Models\ReturnRequest;
use App\Services\RefundCalculatorService;
use App\Services\RefundService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RefundManagementController extends Controller
{
    use ApiResponse;

    public function __construct(private RefundService $service, private RefundCalculatorService $calculator) {}

    public function index(Request $request)
    {
        return $this->success(Refund::with('order', 'returnRequest', 'processor')->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))->latest('requested_at')->paginate(20));
    }

    public function show(Refund $refund)
    {
        return $this->success($refund->load('order', 'payment', 'returnRequest', 'processor'));
    }

    public function createForReturn(Request $request, ReturnRequest $returnRequest)
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'], 'method' => ['required', Rule::in(['manual_bank_transfer', 'cash', 'manual'])],
            'transaction_code' => ['nullable', 'string', 'max:190'], 'reason' => ['nullable', 'string', 'max:2000'], 'admin_note' => ['nullable', 'string', 'max:3000'],
        ]);
        $returnRequest->loadMissing('order.payment');
        $refund = $this->service->create($returnRequest->order->payment, $data, $request->user()->id, $returnRequest);

        return $this->success($refund->load('order', 'payment', 'returnRequest', 'processor'), 'Refund created.', 201);
    }

    public function summary(ReturnRequest $returnRequest)
    {
        $returnRequest->loadMissing('order.payment');

        return $this->success([
            'suggested' => $this->calculator->suggestedForReturn($returnRequest),
            'already_refunded' => (float) $returnRequest->refunds()->where('status', 'completed')->sum('amount'),
            'remaining_payment' => $this->service->remainingRefundableAmount($returnRequest->order->payment),
        ]);
    }

    public function complete(Request $request, Refund $refund)
    {
        $data = $request->validate(['transaction_code' => ['nullable', 'string', 'max:190']]);

        return $this->success($this->service->complete($refund, $request->user()->id, $data['transaction_code'] ?? null));
    }

    public function cancel(Request $request, Refund $refund)
    {
        return $this->success($this->service->cancel($refund, $request->user()->id));
    }
}
