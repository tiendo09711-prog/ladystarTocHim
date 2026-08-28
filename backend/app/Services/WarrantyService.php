<?php

namespace App\Services;

use App\Models\AfterSalesShipment;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\WarrantyRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WarrantyService
{
    public function __construct(private AfterSalesEligibilityService $eligibility, private InventoryService $inventoryService) {}

    public function create(Order $order, OrderItem $item, array $data, ?int $userId): WarrantyRequest
    {
        return DB::transaction(function () use ($order, $item, $data, $userId) {
            $lockedOrder = Order::with('shipment')->lockForUpdate()->findOrFail($order->id);
            $lockedItem = OrderItem::with('product')->where('order_id', $lockedOrder->id)->lockForUpdate()->findOrFail($item->id);
            if (! $this->eligibility->canClaimWarranty($lockedOrder, $lockedItem)) {
                throw ValidationException::withMessages(['order_item' => 'This item is not eligible for warranty.']);
            }
            if ($lockedItem->warrantyRequests()->whereIn('status', WarrantyRequest::ACTIVE_STATUSES)->exists()) {
                throw ValidationException::withMessages(['order_item' => 'An active warranty claim already exists.']);
            }
            $claim = WarrantyRequest::create([
                'code' => $this->uniqueCode(), 'user_id' => $userId, 'order_id' => $lockedOrder->id, 'order_item_id' => $lockedItem->id,
                'status' => 'requested', 'issue_type' => $data['issue_type'], 'description' => $data['description'],
                'requested_resolution' => $data['requested_resolution'] ?? null, 'customer_note' => $data['customer_note'] ?? null,
                'requested_at' => now(),
            ]);

            return $this->load($claim);
        });
    }

    public function review(WarrantyRequest $claim, ?string $note = null): WarrantyRequest
    {
        return $this->transition($claim, ['requested'], 'reviewing', ['reviewed_at' => now(), 'admin_note' => $note]);
    }

    public function approve(WarrantyRequest $claim, string $resolution, ?int $replacementVariantId, ?int $branchId, ?string $note = null): WarrantyRequest
    {
        return DB::transaction(function () use ($claim, $resolution, $replacementVariantId, $branchId, $note) {
            $locked = WarrantyRequest::with('order')->lockForUpdate()->findOrFail($claim->id);
            if ($locked->status === 'approved') {
                return $this->load($locked);
            }
            if ($locked->status !== 'reviewing') {
                throw ValidationException::withMessages(['status' => 'Invalid warranty lifecycle transition.']);
            }
            $updates = ['status' => 'approved', 'actual_resolution' => $resolution, 'approved_at' => now(), 'receiving_branch_id' => $branchId, 'admin_note' => $note];
            if ($resolution === 'replacement') {
                if (! $replacementVariantId) {
                    throw ValidationException::withMessages(['replacement_variant_id' => 'A replacement variant is required.']);
                }
                $variant = ProductVariant::with('product')->whereKey($replacementVariantId)->lockForUpdate()->firstOrFail();
                if ($variant->status !== 'active' || $variant->product->status !== 'active') {
                    throw ValidationException::withMessages(['replacement_variant_id' => 'Replacement variant is inactive.']);
                }
                $inventory = Inventory::where('branch_id', $locked->order->branch_id)->where('product_variant_id', $variant->id)->lockForUpdate()->first();
                if (! $inventory) {
                    throw ValidationException::withMessages(['stock' => 'Replacement inventory is unavailable.']);
                }
                $this->inventoryService->reserveForReference($inventory, 1, 'warranty_reserve', null, $locked, $locked->code);
                $updates['replacement_variant_id'] = $variant->id;
                $updates['replacement_reserved_at'] = now();
            }
            $locked->update(array_filter($updates, fn ($value) => $value !== null));

            return $this->load($locked);
        });
    }

    public function reject(WarrantyRequest $claim, string $reason, ?string $note = null): WarrantyRequest
    {
        return $this->closeBeforeDispatch($claim, ['requested', 'reviewing', 'approved'], 'rejected', ['rejection_reason' => $reason, 'admin_note' => $note]);
    }

    public function cancel(WarrantyRequest $claim): WarrantyRequest
    {
        return $this->closeBeforeDispatch($claim, ['requested', 'reviewing', 'approved'], 'cancelled', ['cancelled_at' => now()]);
    }

    public function receive(WarrantyRequest $claim): WarrantyRequest
    {
        return $this->transition($claim, ['approved'], 'received', ['received_at' => now()]);
    }

    public function startProcessing(WarrantyRequest $claim): WarrantyRequest
    {
        return $this->transition($claim, ['received'], 'processing');
    }

    public function markReady(WarrantyRequest $claim): WarrantyRequest
    {
        return $this->transition($claim, ['processing'], 'ready');
    }

    public function complete(WarrantyRequest $claim): WarrantyRequest
    {
        return $this->transition($claim, ['ready', 'processing'], 'completed', ['completed_at' => now()]);
    }

    public function updateShipmentStatus(AfterSalesShipment $shipment, string $status, int $actorId): AfterSalesShipment
    {
        return DB::transaction(function () use ($shipment, $status, $actorId) {
            $lockedShipment = AfterSalesShipment::lockForUpdate()->findOrFail($shipment->id);
            $claim = WarrantyRequest::with('order')->lockForUpdate()->findOrFail($lockedShipment->warranty_request_id);
            if ($lockedShipment->status === $status) {
                return $lockedShipment;
            }
            if ($status === 'shipped') {
                if ($lockedShipment->status !== 'pending') {
                    throw ValidationException::withMessages(['status' => 'Shipment was already dispatched.']);
                }
                if ($lockedShipment->purpose === 'warranty_outbound' && $claim->actual_resolution === 'replacement' && ! $claim->replacement_consumed_at) {
                    if (! $claim->replacement_reserved_at || $claim->replacement_released_at) {
                        throw ValidationException::withMessages(['stock' => 'Replacement reservation is missing.']);
                    }
                    $inventory = Inventory::where('branch_id', $claim->order->branch_id)->where('product_variant_id', $claim->replacement_variant_id)->lockForUpdate()->firstOrFail();
                    $this->inventoryService->consumeReservation($inventory, 1, 'warranty_consume', $actorId, $claim, $claim->code);
                    $claim->update(['replacement_consumed_at' => now()]);
                }
                $lockedShipment->update(['status' => 'shipped', 'shipped_at' => now()]);
            } elseif ($status === 'delivered') {
                if ($lockedShipment->status !== 'shipped') {
                    throw ValidationException::withMessages(['status' => 'Shipment must be shipped first.']);
                }
                $lockedShipment->update(['status' => 'delivered', 'delivered_at' => now()]);
                if ($lockedShipment->purpose === 'warranty_outbound') {
                    $claim->update(['status' => 'completed', 'completed_at' => now()]);
                }
            } else {
                throw ValidationException::withMessages(['status' => 'Invalid warranty shipment status.']);
            }

            return $lockedShipment->refresh();
        });
    }

    private function transition(WarrantyRequest $claim, array $from, string $to, array $updates = []): WarrantyRequest
    {
        return DB::transaction(function () use ($claim, $from, $to, $updates) {
            $locked = WarrantyRequest::lockForUpdate()->findOrFail($claim->id);
            if ($locked->status === $to) {
                return $this->load($locked);
            }
            if (! in_array($locked->status, $from, true)) {
                throw ValidationException::withMessages(['status' => 'Invalid warranty lifecycle transition.']);
            }
            $locked->update(['status' => $to] + array_filter($updates, fn ($value) => $value !== null));

            return $this->load($locked);
        });
    }

    private function closeBeforeDispatch(WarrantyRequest $claim, array $from, string $to, array $updates): WarrantyRequest
    {
        return DB::transaction(function () use ($claim, $from, $to, $updates) {
            $locked = WarrantyRequest::with('order')->lockForUpdate()->findOrFail($claim->id);
            if ($locked->status === $to) {
                return $this->load($locked);
            }
            if (! in_array($locked->status, $from, true)) {
                throw ValidationException::withMessages(['status' => 'Invalid warranty lifecycle transition.']);
            }
            if ($locked->replacement_reserved_at && ! $locked->replacement_released_at && ! $locked->replacement_consumed_at) {
                $inventory = Inventory::where('branch_id', $locked->order->branch_id)->where('product_variant_id', $locked->replacement_variant_id)->lockForUpdate()->firstOrFail();
                $this->inventoryService->releaseReservation($inventory, 1, 'warranty_release', null, $locked, $locked->code);
                $locked->replacement_released_at = now();
            }
            $locked->fill(['status' => $to] + array_filter($updates, fn ($value) => $value !== null))->save();

            return $this->load($locked);
        });
    }

    private function load(WarrantyRequest $claim): WarrantyRequest
    {
        return $claim->refresh()->load('order', 'orderItem.product.images', 'orderItem.variant', 'replacementVariant', 'receivingBranch', 'media', 'shipments');
    }

    private function uniqueCode(): string
    {
        do {
            $code = 'WR-'.now()->format('ymd').'-'.strtoupper(Str::random(6));
        } while (WarrantyRequest::where('code', $code)->exists());

        return $code;
    }
}
