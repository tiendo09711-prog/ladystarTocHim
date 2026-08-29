<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerWarrantyResource;
use App\Models\Order;
use App\Models\WarrantyRequest;
use App\Services\GuestScopeTokenService;
use App\Services\WarrantyService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class GuestWarrantyController extends Controller
{
    use ApiResponse;

    public function __construct(private WarrantyService $service, private GuestScopeTokenService $tokens) {}

    public function store(Request $request)
    {
        $data = $request->validate(['order_id' => ['required', 'integer'], 'order_item_id' => ['required', 'integer'], 'quantity' => ['sometimes', 'integer', 'min:1'], 'issue_type' => ['required', 'string', 'max:80'], 'description' => ['required', 'string', 'max:5000'], 'requested_resolution' => ['nullable', Rule::in(['repair', 'replacement'])], 'customer_note' => ['nullable', 'string', 'max:3000'], 'images' => ['nullable', 'array', 'max:5'], 'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120']]);
        $order = Order::whereKey($data['order_id'])->whereNull('user_id')->firstOrFail();
        $this->tokens->verify($this->token($request), 'guest_order_after_sales', $order->id, $order->customer_phone);
        $item = $order->items()->whereKey($data['order_item_id'])->firstOrFail();

        $claim = $this->service->create($order, $item, $data, null);
        foreach ($request->file('images', []) as $index => $image) {
            $path = $image->storeAs('after-sales/warranties/'.$claim->id, Str::uuid().'.'.$image->extension(), 'local');
            $claim->media()->create(['path' => $path, 'disk' => 'local', 'mime_type' => $image->getMimeType(), 'original_name' => basename($image->getClientOriginalName()), 'sort_order' => $index]);
        }

        return $this->success((new CustomerWarrantyResource($claim->refresh()->load('order', 'orderItem', 'media', 'shipments')))->resolve(), 'Warranty request created.', 201);
    }

    public function show(Request $request, string $code)
    {
        $claim = WarrantyRequest::where('code', $code)->whereNull('user_id')->with('order', 'orderItem', 'replacementVariant', 'media', 'shipments')->firstOrFail();
        abort_unless($claim->order->user_id === null, 404);
        $this->tokens->verify($this->token($request), 'guest_order_after_sales', $claim->order_id, $claim->order->customer_phone);

        return $this->success((new CustomerWarrantyResource($claim))->resolve());
    }

    public function cancel(Request $request, string $code)
    {
        $claim = WarrantyRequest::where('code', $code)->whereNull('user_id')->with('order')->firstOrFail();
        abort_unless($claim->order->user_id === null, 404);
        $this->tokens->verify($this->token($request), 'guest_order_after_sales', $claim->order_id, $claim->order->customer_phone);

        return $this->success((new CustomerWarrantyResource($this->service->cancel($claim)))->resolve());
    }

    private function token(Request $request): string
    {
        return (string) ($request->header('X-Guest-Token') ?: $request->input('token'));
    }
}
