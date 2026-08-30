<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerReturnRequestResource;
use App\Models\Order;
use App\Models\ReturnRequest;
use App\Services\GuestScopeTokenService;
use App\Services\ReturnRequestService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class GuestReturnController extends Controller
{
    use ApiResponse;

    public function __construct(private ReturnRequestService $service, private GuestScopeTokenService $tokens) {}

    public function store(Request $request)
    {
        $data = $this->validated($request, true);
        $order = Order::whereKey($data['order_id'])->whereNull('user_id')->firstOrFail();
        $this->tokens->verify($this->token($request), 'guest_order_after_sales', $order->id, $order->customer_phone);
        $return = $this->service->createRequest($order, $data, null);
        $this->storeMedia($request, $return);

        return $this->success((new CustomerReturnRequestResource($return->refresh()->load('order', 'items.orderItem', 'media', 'shipments', 'refunds')))->resolve(), 'Return request created.', 201);
    }

    public function show(Request $request, string $code)
    {
        $return = ReturnRequest::where('code', $code)->whereNull('user_id')->with('order', 'items.orderItem', 'items.replacementVariant', 'media', 'shipments', 'refunds')->firstOrFail();
        abort_unless($return->order->user_id === null, 404);
        $this->tokens->verify($this->token($request), 'guest_order_after_sales', $return->order_id, $return->order->customer_phone);

        return $this->success((new CustomerReturnRequestResource($return))->resolve());
    }

    public function cancel(Request $request, string $code)
    {
        $return = ReturnRequest::where('code', $code)->whereNull('user_id')->with('order')->firstOrFail();
        abort_unless($return->order->user_id === null, 404);
        $this->tokens->verify($this->token($request), 'guest_order_after_sales', $return->order_id, $return->order->customer_phone);

        return $this->success((new CustomerReturnRequestResource($this->service->cancel($return)))->resolve());
    }

    private function validated(Request $request, bool $withOrder): array
    {
        return $request->validate([
            'order_id' => [$withOrder ? 'required' : 'nullable', 'integer'], 'request_type' => ['required', Rule::in(['return', 'exchange'])],
            'customer_note' => ['nullable', 'string', 'max:3000'], 'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'integer'], 'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.reason_code' => ['required', 'string', 'max:80'], 'items.*.reason_detail' => ['nullable', 'string', 'max:2000'],
            'items.*.replacement_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'images' => ['nullable', 'array', 'max:5'], 'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
    }

    private function token(Request $request): string
    {
        return (string) ($request->header('X-Guest-Token') ?: $request->input('token'));
    }

    private function storeMedia(Request $request, ReturnRequest $return): void
    {
        foreach ($request->file('images', []) as $index => $image) {
            $path = $image->storeAs('after-sales/returns/'.$return->id, Str::uuid().'.'.$image->extension(), 'local');
            $return->media()->create(['path' => $path, 'disk' => 'local', 'mime_type' => $image->getMimeType(), 'original_name' => basename($image->getClientOriginalName()), 'sort_order' => $index]);
        }
    }
}
