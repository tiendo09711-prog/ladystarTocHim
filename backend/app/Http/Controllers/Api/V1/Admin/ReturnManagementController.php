<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminReturnRequestResource;
use App\Models\AfterSalesShipment;
use App\Models\ReturnRequest;
use App\Services\AfterSalesShipmentService;
use App\Services\ReturnRequestService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReturnManagementController extends Controller
{
    use ApiResponse;

    public function __construct(private ReturnRequestService $service, private AfterSalesShipmentService $shipments) {}

    public function index(Request $request)
    {
        $query = ReturnRequest::with('order.user', 'items.orderItem')->latest('requested_at');
        $query->when($request->filled('code'), fn ($q) => $q->where('code', 'like', '%'.$request->string('code').'%'));
        $query->when($request->filled('order_number'), fn ($q) => $q->whereHas('order', fn ($o) => $o->where('order_number', 'like', '%'.$request->string('order_number').'%')));
        $query->when($request->filled('customer'), fn ($q) => $q->whereHas('order', fn ($o) => $o->where('customer_name', 'like', '%'.$request->string('customer').'%')));
        $query->when($request->filled('phone'), fn ($q) => $q->whereHas('order', fn ($o) => $o->where('customer_phone', 'like', '%'.$request->string('phone').'%')));
        $query->when($request->filled('request_type'), fn ($q) => $q->where('request_type', $request->input('request_type')));
        $query->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')));
        $query->when($request->filled('from'), fn ($q) => $q->whereDate('requested_at', '>=', $request->input('from')));
        $query->when($request->filled('to'), fn ($q) => $q->whereDate('requested_at', '<=', $request->input('to')));
        $rows = $query->paginate(20);
        $rows->setCollection($rows->getCollection()->map(fn ($row) => (new AdminReturnRequestResource($row))->resolve()));

        return $this->success($rows);
    }

    public function show(ReturnRequest $returnRequest)
    {
        return $this->success((new AdminReturnRequestResource($this->load($returnRequest)))->resolve());
    }

    public function review(Request $request, ReturnRequest $returnRequest)
    {
        return $this->result($this->service->startReview($returnRequest, $request->input('admin_note')));
    }

    public function approve(Request $request, ReturnRequest $returnRequest)
    {
        $data = $request->validate(['receiving_branch_id' => ['nullable', 'exists:branches,id'], 'admin_note' => ['nullable', 'string', 'max:3000']]);

        return $this->result($this->service->approve($returnRequest, $data['receiving_branch_id'] ?? null, $data['admin_note'] ?? null));
    }

    public function reject(Request $request, ReturnRequest $returnRequest)
    {
        $data = $request->validate(['rejection_reason' => ['required', 'string', 'max:3000'], 'admin_note' => ['nullable', 'string', 'max:3000']]);

        return $this->result($this->service->reject($returnRequest, $data['rejection_reason'], $data['admin_note'] ?? null));
    }

    public function markReturning(ReturnRequest $returnRequest)
    {
        return $this->result($this->service->markReturning($returnRequest));
    }

    public function receive(Request $request, ReturnRequest $returnRequest)
    {
        $data = $request->validate([
            'receiving_branch_id' => ['nullable', 'exists:branches,id'], 'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'distinct'], 'items.*.condition_status' => ['required', Rule::in(['unused', 'opened', 'used', 'damaged', 'defective'])],
            'items.*.restockable' => ['required', 'boolean'],
        ]);

        return $this->result($this->service->receive($returnRequest, $data['items'], $request->user()->id, $data['receiving_branch_id'] ?? null));
    }

    public function complete(ReturnRequest $returnRequest)
    {
        return $this->result($this->service->complete($returnRequest));
    }

    public function saveShipment(Request $request, ReturnRequest $returnRequest)
    {
        $data = $request->validate([
            'purpose' => ['required', Rule::in(['return_inbound', 'exchange_outbound'])], 'carrier' => ['nullable', 'string', 'max:190'],
            'tracking_number' => ['nullable', 'string', 'max:190'], 'shipping_fee_actual' => ['nullable', 'numeric', 'min:0'],
            'tracking_url' => ['nullable', 'url', 'max:1000'], 'note' => ['nullable', 'string', 'max:2000'],
        ]);
        $purpose = $data['purpose'];
        unset($data['purpose']);

        return $this->success($this->shipments->save($returnRequest, $purpose, $data, $request->user()->id));
    }

    public function shipmentStatus(Request $request, ReturnRequest $returnRequest, AfterSalesShipment $shipment)
    {
        abort_unless($shipment->return_request_id === $returnRequest->id, 404);
        $status = $request->validate(['status' => ['required', Rule::in(['shipped', 'delivered'])]])['status'];
        $updated = $shipment->purpose === 'exchange_outbound'
            ? $this->service->updateExchangeShipmentStatus($shipment, $status, $request->user()->id)
            : $this->shipments->updateStatus($shipment, $status);

        return $this->success($updated);
    }

    private function result(ReturnRequest $request)
    {
        return $this->success((new AdminReturnRequestResource($request))->resolve());
    }

    private function load(ReturnRequest $returnRequest): ReturnRequest
    {
        return $returnRequest->load('order.user', 'order.branch', 'order.payment', 'items.orderItem.product.images', 'items.orderItem.variant', 'items.replacementVariant', 'media', 'receivingBranch', 'shipments', 'refunds.processor');
    }
}
