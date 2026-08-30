<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminWarrantyResource;
use App\Models\AfterSalesShipment;
use App\Models\WarrantyRequest;
use App\Services\AfterSalesShipmentService;
use App\Services\WarrantyService;
use App\Support\ApiResponse;
use App\Support\PhoneNormalizer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WarrantyManagementController extends Controller
{
    use ApiResponse;

    public function __construct(private WarrantyService $service, private AfterSalesShipmentService $shipments) {}

    public function index(Request $request)
    {
        $query = WarrantyRequest::with('order', 'orderItem')->latest('requested_at');
        $query->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')));
        $query->when($request->filled('code'), fn ($q) => $q->where('code', 'like', '%'.$request->string('code').'%'));
        $query->when($request->filled('customer'), fn ($q) => $q->whereHas('order', fn ($o) => $o->where('customer_name', 'like', '%'.$request->string('customer').'%')));
        $query->when($request->filled('phone'), function ($q) use ($request) {
            $phone = PhoneNormalizer::normalizeIfPossible($request->input('phone')) ?? trim((string) $request->input('phone'));
            $q->whereHas('order', fn ($order) => $order->where('customer_phone', 'like', '%'.$phone.'%'));
        });
        $rows = $query->paginate(20);
        $rows->setCollection($rows->getCollection()->map(fn ($row) => (new AdminWarrantyResource($row))->resolve()));

        return $this->success($rows);
    }

    public function show(WarrantyRequest $warrantyRequest)
    {
        return $this->result($this->load($warrantyRequest));
    }

    public function review(Request $request, WarrantyRequest $warrantyRequest)
    {
        return $this->result($this->service->review($warrantyRequest, $request->input('admin_note')));
    }

    public function approve(Request $request, WarrantyRequest $warrantyRequest)
    {
        $data = $request->validate(['actual_resolution' => ['required', Rule::in(['repair', 'replacement'])], 'replacement_variant_id' => ['nullable', 'exists:product_variants,id'], 'receiving_branch_id' => ['nullable', 'exists:branches,id'], 'admin_note' => ['nullable', 'string', 'max:3000']]);

        return $this->result($this->service->approve($warrantyRequest, $data['actual_resolution'], $data['replacement_variant_id'] ?? null, $data['receiving_branch_id'] ?? null, $data['admin_note'] ?? null));
    }

    public function reject(Request $request, WarrantyRequest $warrantyRequest)
    {
        $data = $request->validate(['rejection_reason' => ['required', 'string', 'max:3000'], 'admin_note' => ['nullable', 'string', 'max:3000']]);

        return $this->result($this->service->reject($warrantyRequest, $data['rejection_reason'], $data['admin_note'] ?? null));
    }

    public function receive(WarrantyRequest $warrantyRequest)
    {
        return $this->result($this->service->receive($warrantyRequest));
    }

    public function startProcessing(WarrantyRequest $warrantyRequest)
    {
        return $this->result($this->service->startProcessing($warrantyRequest));
    }

    public function ready(WarrantyRequest $warrantyRequest)
    {
        return $this->result($this->service->markReady($warrantyRequest));
    }

    public function complete(WarrantyRequest $warrantyRequest)
    {
        return $this->result($this->service->complete($warrantyRequest));
    }

    public function handover(Request $request, WarrantyRequest $warrantyRequest)
    {
        return $this->result($this->service->handoverReplacement($warrantyRequest, $request->user()->id));
    }

    public function saveShipment(Request $request, WarrantyRequest $warrantyRequest)
    {
        $data = $request->validate(['purpose' => ['required', Rule::in(['warranty_inbound', 'warranty_outbound'])], 'carrier' => ['nullable', 'string', 'max:190'], 'tracking_number' => ['nullable', 'string', 'max:190'], 'shipping_fee_actual' => ['nullable', 'numeric', 'min:0'], 'tracking_url' => ['nullable', 'url', 'max:1000'], 'note' => ['nullable', 'string', 'max:2000']]);
        $purpose = $data['purpose'];
        unset($data['purpose']);
        $auditAction = $warrantyRequest->shipments()->where('purpose', $purpose)->exists() ? 'updated' : 'created';
        $shipment = $this->shipments->save($warrantyRequest, $purpose, $data, $request->user()->id);
        $request->attributes->set('audit.after_sales_shipment_action', $auditAction);

        return $this->success($shipment);
    }

    public function shipmentStatus(Request $request, WarrantyRequest $warrantyRequest, AfterSalesShipment $shipment)
    {
        abort_unless($shipment->warranty_request_id === $warrantyRequest->id, 404);
        $data = $request->validate([
            'status' => ['required', Rule::in(['shipped', 'delivered', 'delivery_failed', 'returned'])],
            'failure_reason' => ['nullable', 'string', 'max:2000'],
            'return_reason' => ['nullable', 'string', 'max:2000'],
        ]);
        $status = $data['status'];
        $reason = $status === 'delivery_failed' ? ($data['failure_reason'] ?? null) : ($data['return_reason'] ?? null);

        return $this->success($this->service->updateShipmentStatus($shipment, $status, $request->user()->id, $reason));
    }

    private function result(WarrantyRequest $claim)
    {
        return $this->success((new AdminWarrantyResource($claim))->resolve());
    }

    private function load(WarrantyRequest $claim): WarrantyRequest
    {
        return $claim->load('order', 'orderItem.product.images', 'orderItem.variant', 'replacementVariant', 'receivingBranch', 'media', 'shipments');
    }
}
