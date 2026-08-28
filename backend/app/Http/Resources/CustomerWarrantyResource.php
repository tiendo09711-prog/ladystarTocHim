<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CustomerWarrantyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'status' => $this->status, 'issue_type' => $this->issue_type,
            'description' => $this->description, 'requested_resolution' => $this->requested_resolution, 'actual_resolution' => $this->actual_resolution,
            'customer_note' => $this->customer_note, 'rejection_reason' => $this->rejection_reason, 'requested_at' => $this->requested_at,
            'reviewed_at' => $this->reviewed_at, 'approved_at' => $this->approved_at, 'received_at' => $this->received_at,
            'completed_at' => $this->completed_at, 'cancelled_at' => $this->cancelled_at,
            'order' => $this->order?->only(['id', 'order_number']),
            'order_item' => $this->orderItem?->only(['id', 'product_name', 'variant_description', 'sku', 'warranty_days_snapshot']),
            'replacement_variant' => $this->replacementVariant?->only(['id', 'sku']),
            'media' => $this->whenLoaded('media', fn () => $this->media->map(fn ($medium) => ['id' => $medium->id, 'url' => Storage::disk('public')->url($medium->path)])),
            'shipments' => $this->whenLoaded('shipments', fn () => $this->shipments->map->only(['id', 'purpose', 'carrier', 'tracking_number', 'status', 'shipped_at', 'delivered_at', 'tracking_url'])),
        ];
    }
}
