<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerReturnRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'request_type' => $this->request_type, 'status' => $this->status,
            'customer_note' => $this->customer_note, 'rejection_reason' => $this->rejection_reason,
            'requested_at' => $this->requested_at, 'reviewed_at' => $this->reviewed_at, 'approved_at' => $this->approved_at,
            'received_at' => $this->received_at, 'completed_at' => $this->completed_at, 'cancelled_at' => $this->cancelled_at,
            'order' => $this->whenLoaded('order', fn () => ['id' => $this->order->id, 'order_number' => $this->order->order_number, 'order_status' => $this->order->order_status]),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id, 'quantity' => $item->quantity, 'reason_code' => $item->reason_code, 'reason_detail' => $item->reason_detail,
                'condition_status' => $item->condition_status, 'restockable' => $item->restockable,
                'refund_amount' => $item->refund_amount !== null ? (float) $item->refund_amount : null,
                'order_item' => $item->orderItem?->only(['id', 'product_name', 'variant_description', 'sku', 'unit_price', 'quantity', 'variant_snapshot']),
                'replacement_variant' => $item->replacementVariant?->only(['id', 'sku']),
            ])),
            'media' => $this->whenLoaded('media', fn () => $this->media->map(fn ($medium) => ['id' => $medium->id, 'url' => $medium->urlFor($request), 'mime_type' => $medium->mime_type])),
            'shipments' => $this->whenLoaded('shipments', fn () => $this->shipments->map->only(['id', 'purpose', 'carrier', 'tracking_number', 'status', 'shipped_at', 'delivered_at', 'tracking_url'])),
            'refunds' => $this->whenLoaded('refunds', fn () => $this->refunds->map->only(['id', 'code', 'amount', 'status', 'method', 'transaction_code', 'completed_at'])),
        ];
    }
}
