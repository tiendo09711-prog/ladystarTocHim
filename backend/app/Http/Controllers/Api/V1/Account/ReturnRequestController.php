<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerReturnRequestResource;
use App\Models\ReturnRequest;
use App\Services\ReturnRequestService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ReturnRequestController extends Controller
{
    use ApiResponse;

    public function __construct(private ReturnRequestService $service) {}

    public function index(Request $request)
    {
        $rows = $request->user()->returnRequests()->with('order', 'items.orderItem', 'media', 'shipments', 'refunds')->latest('requested_at')->paginate(10);
        $rows->setCollection($rows->getCollection()->map(fn ($row) => (new CustomerReturnRequestResource($row))->resolve()));

        return $this->success($rows);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $order = $request->user()->orders()->whereKey($data['order_id'])->firstOrFail();
        $return = $this->service->createRequest($order, $data, $request->user()->id);
        $this->storeMedia($request, $return);

        return $this->success((new CustomerReturnRequestResource($return->refresh()->load('order', 'items.orderItem', 'media', 'shipments', 'refunds')))->resolve(), 'Return request created.', 201);
    }

    public function show(Request $request, ReturnRequest $returnRequest)
    {
        $row = $request->user()->returnRequests()->whereKey($returnRequest->id)->with('order', 'items.orderItem', 'items.replacementVariant', 'media', 'shipments', 'refunds')->firstOrFail();

        return $this->success((new CustomerReturnRequestResource($row))->resolve());
    }

    public function cancel(Request $request, ReturnRequest $returnRequest)
    {
        $row = $request->user()->returnRequests()->whereKey($returnRequest->id)->firstOrFail();

        return $this->success((new CustomerReturnRequestResource($this->service->cancel($row)))->resolve());
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'order_id' => ['required', 'integer'], 'request_type' => ['required', Rule::in(['return', 'exchange'])],
            'customer_note' => ['nullable', 'string', 'max:3000'], 'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'integer'], 'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.reason_code' => ['required', 'string', 'max:80'], 'items.*.reason_detail' => ['nullable', 'string', 'max:2000'],
            'items.*.replacement_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'images' => ['nullable', 'array', 'max:5'], 'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
    }

    private function storeMedia(Request $request, ReturnRequest $return): void
    {
        foreach ($request->file('images', []) as $index => $image) {
            $path = $image->storePubliclyAs('after-sales/returns/'.$return->id, Str::uuid().'.'.$image->extension(), 'public');
            $return->media()->create(['path' => $path, 'mime_type' => $image->getMimeType(), 'original_name' => basename($image->getClientOriginalName()), 'sort_order' => $index]);
        }
    }
}
