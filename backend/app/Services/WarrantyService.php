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
            $quantity = (int) ($data['quantity'] ?? 1);
            if ($quantity < 1 || $quantity > $this->eligibility->warrantyableQuantity($lockedItem)) {
                throw ValidationException::withMessages(['quantity' => 'Warranty quantity exceeds the eligible purchased quantity.']);
            }
            if ($lockedItem->warrantyRequests()->whereIn('status', WarrantyRequest::ACTIVE_STATUSES)->exists()) {
                throw ValidationException::withMessages(['order_item' => 'An active warranty claim already exists.']);
            }
            $claim = WarrantyRequest::create([
                'code' => $this->uniqueCode(), 'user_id' => $userId, 'order_id' => $lockedOrder->id, 'order_item_id' => $lockedItem->id,
                'status' => 'requested', 'issue_type' => $data['issue_type'], 'description' => $data['description'],
                'quantity' => $quantity,
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
            $locked = WarrantyRequest::with('order', 'orderItem')->lockForUpdate()->findOrFail($claim->id);
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
                if ($variant->product_id !== $locked->orderItem->product_id) {
                    throw ValidationException::withMessages(['replacement_variant_id' => 'Replacement must belong to the same product.']);
                }
                if ($variant->status !== 'active' || $variant->product->status !== 'active') {
                    throw ValidationException::withMessages(['replacement_variant_id' => 'Replacement variant is inactive.']);
                }
                $inventory = Inventory::where('branch_id', $locked->order->branch_id)->where('product_variant_id', $variant->id)->lockForUpdate()->first();
                if (! $inventory) {
                    throw ValidationException::withMessages(['stock' => 'Replacement inventory is unavailable.']);
                }
                $this->inventoryService->reserveForReference($inventory, (int) $locked->quantity, 'warranty_reserve', null, $locked, $locked->code);
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
        return DB::transaction(function () use ($claim) {
            $locked = WarrantyRequest::lockForUpdate()->findOrFail($claim->id);
            if ($locked->actual_resolution === 'replacement') {
                throw ValidationException::withMessages(['status' => 'Replacement warranty must be completed by delivery or handover.']);
            }
            if ($locked->status === 'completed') {
                return $this->load($locked);
            }
            if (! in_array($locked->status, ['ready', 'processing'], true)) {
                throw ValidationException::withMessages(['status' => 'Invalid warranty lifecycle transition.']);
            }
            if ($locked->replacement_reserved_at && ! $locked->replacement_released_at && ! $locked->replacement_consumed_at) {
                throw ValidationException::withMessages(['stock' => 'Warranty cannot complete with a dangling reservation.']);
            }
            $locked->update(['status' => 'completed', 'completed_at' => now()]);

            return $this->load($locked);
        });
    }

    public function handoverReplacement(WarrantyRequest $claim, int $actorId): WarrantyRequest
    {
        return DB::transaction(function () use ($claim, $actorId) {
            $locked = WarrantyRequest::with('order')->lockForUpdate()->findOrFail($claim->id);
            if ($locked->status === 'completed') {
                return $this->load($locked);
            }
            if ($locked->actual_resolution !== 'replacement' || $locked->status !== 'ready') {
                throw ValidationException::withMessages(['status' => 'Replacement is not ready for handover.']);
            }
            $outbound = AfterSalesShipment::where('warranty_request_id', $locked->id)
                ->where('purpose', 'warranty_outbound')->lockForUpdate()->first();
            if ($outbound && in_array($outbound->status, ['pending', 'shipped', 'delivery_failed'], true)) {
                throw ValidationException::withMessages(['shipment' => 'Cannot hand over replacement while an outbound shipment is active.']);
            }
            if ($outbound?->status === 'delivered') {
                throw ValidationException::withMessages(['shipment' => 'Replacement was already delivered.']);
            }
            if ($locked->replacement_restocked_at) {
                $inventory = Inventory::where('branch_id', $locked->order->branch_id)->where('product_variant_id', $locked->replacement_variant_id)->lockForUpdate()->firstOrFail();
                $this->inventoryService->reserveForReference($inventory, (int) $locked->quantity, 'warranty_retry_reserve', $actorId, $locked, $locked->code);
                $this->inventoryService->consumeReservation($inventory->refresh(), (int) $locked->quantity, 'warranty_retry_consume', $actorId, $locked, $locked->code);
                $locked->update([
                    'replacement_reserved_at' => now(),
                    'replacement_released_at' => null,
                    'replacement_consumed_at' => now(),
                    'replacement_restocked_at' => null,
                ]);
            } elseif (! $locked->replacement_consumed_at) {
                if (! $locked->replacement_reserved_at || $locked->replacement_released_at) {
                    throw ValidationException::withMessages(['stock' => 'Replacement reservation is missing.']);
                }
                $inventory = Inventory::where('branch_id', $locked->order->branch_id)->where('product_variant_id', $locked->replacement_variant_id)->lockForUpdate()->firstOrFail();
                $this->inventoryService->consumeReservation($inventory, (int) $locked->quantity, 'warranty_consume', $actorId, $locked, $locked->code);
                $locked->update(['replacement_consumed_at' => now(), 'replacement_restocked_at' => null]);
            }
            $locked->update(['status' => 'completed', 'completed_at' => now()]);

            return $this->load($locked);
        });
    }

    public function updateShipmentStatus(AfterSalesShipment $shipment, string $status, int $actorId, ?string $reason = null): AfterSalesShipment
    {
        return DB::transaction(function () use ($shipment, $status, $actorId, $reason) {
            $lockedShipment = AfterSalesShipment::lockForUpdate()->findOrFail($shipment->id);
            $claim = WarrantyRequest::with('order')->lockForUpdate()->findOrFail($lockedShipment->warranty_request_id);
            if ($lockedShipment->return_request_id !== null || $lockedShipment->order_id !== $claim->order_id) {
                throw ValidationException::withMessages(['shipment' => 'Shipment does not belong to this warranty claim.']);
            }
            if ($lockedShipment->status === $status) {
                return $lockedShipment;
            }
            if ($status === 'shipped') {
                if (! in_array($lockedShipment->status, ['pending', 'delivery_failed', 'returned'], true)) {
                    throw ValidationException::withMessages(['status' => 'Shipment was already dispatched.']);
                }
                if ($lockedShipment->purpose === 'warranty_outbound' && ($claim->status !== 'ready' || ! in_array($claim->actual_resolution, ['repair', 'replacement'], true))) {
                    throw ValidationException::withMessages(['status' => 'Warranty outbound shipment can only be dispatched when the claim is ready.']);
                }
                if ($lockedShipment->purpose === 'warranty_outbound' && $claim->actual_resolution === 'replacement' && $lockedShipment->status !== 'delivery_failed') {
                    $inventory = Inventory::where('branch_id', $claim->order->branch_id)->where('product_variant_id', $claim->replacement_variant_id)->lockForUpdate()->firstOrFail();
                    if ($lockedShipment->status === 'returned') {
                        if (! $claim->replacement_restocked_at) {
                            throw ValidationException::withMessages(['stock' => 'Returned replacement inventory was not reconciled.']);
                        }
                        $this->inventoryService->reserveForReference($inventory, (int) $claim->quantity, 'warranty_retry_reserve', $actorId, $lockedShipment, $claim->code);
                        $this->inventoryService->consumeReservation($inventory->refresh(), (int) $claim->quantity, 'warranty_retry_consume', $actorId, $lockedShipment, $claim->code);
                        $claim->update([
                            'replacement_reserved_at' => now(),
                            'replacement_released_at' => null,
                            'replacement_consumed_at' => now(),
                            'replacement_restocked_at' => null,
                        ]);
                    } elseif (! $claim->replacement_consumed_at) {
                        if (! $claim->replacement_reserved_at || $claim->replacement_released_at) {
                            throw ValidationException::withMessages(['stock' => 'Replacement reservation is missing.']);
                        }
                        $this->inventoryService->consumeReservation($inventory, (int) $claim->quantity, 'warranty_consume', $actorId, $claim, $claim->code);
                        $claim->update(['replacement_consumed_at' => now(), 'replacement_restocked_at' => null]);
                    }
                }
                $lockedShipment->update(['status' => 'shipped', 'shipped_at' => now()]);
            } elseif ($status === 'delivered') {
                if ($lockedShipment->status !== 'shipped') {
                    throw ValidationException::withMessages(['status' => 'Shipment must be shipped first.']);
                }
                if ($lockedShipment->purpose === 'warranty_outbound') {
                    if ($claim->status !== 'ready' || ! in_array($claim->actual_resolution, ['repair', 'replacement'], true)) {
                        throw ValidationException::withMessages(['status' => 'Warranty claim is not ready for delivery completion.']);
                    }
                    if ($claim->actual_resolution === 'replacement' && (! $claim->replacement_consumed_at || $claim->replacement_restocked_at)) {
                        throw ValidationException::withMessages(['stock' => 'Replacement stock must be consumed before delivery completion.']);
                    }
                }
                $lockedShipment->update(['status' => 'delivered', 'delivered_at' => now()]);
                if ($lockedShipment->purpose === 'warranty_outbound') {
                    $claim->update(['status' => 'completed', 'completed_at' => now()]);
                }
            } elseif ($status === 'delivery_failed') {
                if ($lockedShipment->status !== 'shipped') {
                    throw ValidationException::withMessages(['status' => 'Only a shipped warranty replacement can fail delivery.']);
                }
                $lockedShipment->update(['status' => 'delivery_failed', 'failed_at' => now(), 'failure_reason' => $reason]);
            } elseif ($status === 'returned') {
                if ($lockedShipment->status !== 'delivery_failed') {
                    throw ValidationException::withMessages(['status' => 'Only a failed warranty replacement can be returned.']);
                }
                if ($lockedShipment->purpose === 'warranty_outbound' && $claim->actual_resolution === 'replacement' && $claim->replacement_consumed_at && ! $claim->replacement_restocked_at) {
                    $inventory = Inventory::where('branch_id', $claim->order->branch_id)->where('product_variant_id', $claim->replacement_variant_id)->lockForUpdate()->firstOrFail();
                    $this->inventoryService->adjust($inventory, (int) $claim->quantity, 'warranty_return_restock', $actorId, $claim->code, $lockedShipment, 'warranty_returned');
                    $claim->update(['replacement_restocked_at' => now()]);
                }
                $lockedShipment->update(['status' => 'returned', 'returned_at' => now(), 'return_reason' => $reason]);
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
                $this->inventoryService->releaseReservation($inventory, (int) $locked->quantity, 'warranty_release', null, $locked, $locked->code);
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
