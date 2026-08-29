<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerWarrantyResource;
use App\Models\WarrantyRequest;
use App\Services\WarrantyService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class WarrantyController extends Controller
{
    use ApiResponse;

    public function __construct(private WarrantyService $service) {}

    public function index(Request $request)
    {
        $rows = $request->user()->warrantyRequests()->with('order', 'orderItem', 'replacementVariant', 'media', 'shipments')->latest('requested_at')->paginate(10);
        $rows->setCollection($rows->getCollection()->map(fn ($row) => (new CustomerWarrantyResource($row))->resolve()));

        return $this->success($rows);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $order = $request->user()->orders()->whereKey($data['order_id'])->firstOrFail();
        $item = $order->items()->whereKey($data['order_item_id'])->firstOrFail();
        $claim = $this->service->create($order, $item, $data, $request->user()->id);
        $this->media($request, $claim);

        return $this->success((new CustomerWarrantyResource($claim->refresh()->load('order', 'orderItem', 'media', 'shipments')))->resolve(), 'Warranty request created.', 201);
    }

    public function show(Request $request, WarrantyRequest $warrantyRequest)
    {
        $claim = $request->user()->warrantyRequests()->whereKey($warrantyRequest->id)->with('order', 'orderItem', 'replacementVariant', 'media', 'shipments')->firstOrFail();

        return $this->success((new CustomerWarrantyResource($claim))->resolve());
    }

    public function cancel(Request $request, WarrantyRequest $warrantyRequest)
    {
        $claim = $request->user()->warrantyRequests()->whereKey($warrantyRequest->id)->firstOrFail();

        return $this->success((new CustomerWarrantyResource($this->service->cancel($claim)))->resolve());
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'order_id' => ['required', 'integer'], 'order_item_id' => ['required', 'integer'], 'issue_type' => ['required', 'string', 'max:80'],
            'description' => ['required', 'string', 'max:5000'], 'requested_resolution' => ['nullable', Rule::in(['repair', 'replacement'])],
            'customer_note' => ['nullable', 'string', 'max:3000'], 'images' => ['nullable', 'array', 'max:5'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
    }

    private function media(Request $request, WarrantyRequest $claim): void
    {
        foreach ($request->file('images', []) as $index => $image) {
            $path = $image->storeAs('after-sales/warranties/'.$claim->id, Str::uuid().'.'.$image->extension(), 'local');
            $claim->media()->create(['path' => $path, 'disk' => 'local', 'mime_type' => $image->getMimeType(), 'original_name' => basename($image->getClientOriginalName()), 'sort_order' => $index]);
        }
    }
}
