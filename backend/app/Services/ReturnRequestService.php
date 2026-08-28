<?php

namespace App\Services;

use App\Models\AfterSalesShipment;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use App\Models\ReturnItem;
use App\Models\ReturnRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ReturnRequestService
{
    public function __construct(private AfterSalesEligibilityService $eligibility, private InventoryService $inventoryService) {}

    public function createRequest(Order $order, array $data, ?int $userId): ReturnRequest
    {
        return DB::transaction(function () use ($order, $data, $userId) {
            $lockedOrder = Order::with('shipment')->lockForUpdate()->findOrFail($order->id);
            $allowed = $data['request_type'] === 'exchange' ? $this->eligibility->canExchange($lockedOrder) : $this->eligibility->canReturn($lockedOrder);
            if (! $allowed) {
                throw ValidationException::withMessages(['order' => 'The order is not eligible for after-sales service.']);
            }

            $itemIds = collect($data['items'])->pluck('order_item_id')->map(fn ($id) => (int) $id);
            if ($itemIds->duplicates()->isNotEmpty()) {
                throw ValidationException::withMessages(['items' => 'Each order item may appear only once.']);
            }
            $items = OrderItem::where('order_id', $lockedOrder->id)->whereIn('id', $itemIds)->lockForUpdate()->get()->keyBy('id');
            if ($items->count() !== $itemIds->count()) {
                throw ValidationException::withMessages(['items' => 'An item does not belong to this order.']);
            }

            foreach ($data['items'] as $line) {
                $item = $items[(int) $line['order_item_id']];
                if ((int) $line['quantity'] > $this->eligibility->returnableQuantity($item)) {
                    throw ValidationException::withMessages(['quantity' => 'Requested quantity exceeds the returnable quantity.']);
                }
                if ($data['request_type'] === 'exchange') {
                    if (empty($line['replacement_variant_id'])) {
                        throw ValidationException::withMessages(['replacement_variant_id' => 'A replacement variant is required.']);
                    }
                    $replacement = ProductVariant::with('product')->whereKey($line['replacement_variant_id'])->lockForUpdate()->firstOrFail();
                    if ($replacement->product_id !== $item->product_id) {
                        throw ValidationException::withMessages(['replacement_variant_id' => 'Replacement must belong to the same product.']);
                    }
                    if ($replacement->status !== 'active' || $replacement->product->status !== 'active') {
                        throw ValidationException::withMessages(['replacement_variant_id' => 'Replacement variant is inactive.']);
                    }
                    if ($this->minor($replacement->currentPrice()) !== $this->minor($item->unit_price)) {
                        throw ValidationException::withMessages(['replacement_variant_id' => 'Phase 3 only supports same-price exchanges.']);
                    }
                }
            }

            $request = ReturnRequest::create([
                'code' => $this->uniqueCode(), 'order_id' => $lockedOrder->id, 'user_id' => $userId,
                'request_type' => $data['request_type'], 'status' => 'requested',
                'customer_note' => $data['customer_note'] ?? null, 'requested_at' => now(),
            ]);
            foreach ($data['items'] as $line) {
                $request->items()->create([
                    'order_item_id' => $line['order_item_id'], 'quantity' => $line['quantity'],
                    'reason_code' => $line['reason_code'], 'reason_detail' => $line['reason_detail'] ?? null,
                    'replacement_variant_id' => $line['replacement_variant_id'] ?? null,
                ]);
            }

            return $this->load($request);
        });
    }

    public function startReview(ReturnRequest $request, ?string $adminNote = null): ReturnRequest
    {
        return $this->transition($request, ['requested'], 'reviewing', ['reviewed_at' => now(), 'admin_note' => $adminNote]);
    }

    public function approve(ReturnRequest $request, ?int $branchId = null, ?string $adminNote = null): ReturnRequest
    {
        return DB::transaction(function () use ($request, $branchId, $adminNote) {
            $locked = ReturnRequest::with('order', 'items.orderItem')->lockForUpdate()->findOrFail($request->id);
            if ($locked->status === 'approved') {
                return $this->load($locked);
            }
            if ($locked->status !== 'reviewing') {
                throw ValidationException::withMessages(['status' => 'Invalid return lifecycle transition.']);
            }
            if ($locked->request_type === 'exchange') {
                foreach ($locked->items as $item) {
                    $inventory = Inventory::where('branch_id', $locked->order->branch_id)->where('product_variant_id', $item->replacement_variant_id)->lockForUpdate()->first();
                    if (! $inventory) {
                        throw ValidationException::withMessages(['stock' => 'Replacement inventory is unavailable.']);
                    }
                    $this->inventoryService->reserveForReference($inventory, (int) $item->quantity, 'exchange_reserve', null, $locked, $locked->code);
                    $item->update(['replacement_reserved_at' => now(), 'replacement_released_at' => null]);
                }
            }
            $locked->update(array_filter(['status' => 'approved', 'approved_at' => now(), 'receiving_branch_id' => $branchId, 'admin_note' => $adminNote], fn ($value) => $value !== null));

            return $this->load($locked);
        });
    }

    public function reject(ReturnRequest $request, string $reason, ?string $adminNote = null): ReturnRequest
    {
        return $this->closeBeforeDispatch($request, ['requested', 'reviewing', 'approved'], 'rejected', ['rejected_at' => now(), 'rejection_reason' => $reason, 'admin_note' => $adminNote]);
    }

    public function cancel(ReturnRequest $request): ReturnRequest
    {
        return $this->closeBeforeDispatch($request, ['requested', 'reviewing', 'approved'], 'cancelled', ['cancelled_at' => now()]);
    }

    public function markReturning(ReturnRequest $request): ReturnRequest
    {
        return $this->transition($request, ['approved'], 'returning');
    }

    public function receive(ReturnRequest $request, array $items, int $actorId, ?int $branchId = null): ReturnRequest
    {
        return DB::transaction(function () use ($request, $items, $actorId, $branchId) {
            $locked = ReturnRequest::with('order')->lockForUpdate()->findOrFail($request->id);
            if (in_array($locked->status, ['received', 'completed'], true)) {
                return $this->load($locked);
            }
            if (! in_array($locked->status, ['approved', 'returning'], true)) {
                throw ValidationException::withMessages(['status' => 'The return is not ready to be received.']);
            }
            $payload = collect($items)->keyBy(fn ($item) => (int) $item['id']);
            $returnItems = ReturnItem::where('return_request_id', $locked->id)->with('orderItem')->lockForUpdate()->get();
            if ($payload->count() !== $returnItems->count()) {
                throw ValidationException::withMessages(['items' => 'Every returned item must be inspected.']);
            }
            $receivingBranchId = $branchId ?? $locked->receiving_branch_id ?? $locked->order->branch_id;
            if (! $receivingBranchId) {
                throw ValidationException::withMessages(['receiving_branch_id' => 'A receiving branch is required.']);
            }

            foreach ($returnItems as $item) {
                $line = $payload->get($item->id);
                if (! $line) {
                    throw ValidationException::withMessages(['items' => 'Inspection data is incomplete.']);
                }
                $updates = ['condition_status' => $line['condition_status'], 'restockable' => (bool) $line['restockable']];
                if ($line['restockable'] && ! $item->restocked_at) {
                    $inventory = Inventory::where('branch_id', $receivingBranchId)->where('product_variant_id', $item->orderItem->product_variant_id)->lockForUpdate()->first()
                        ?? $this->inventoryService->create($receivingBranchId, $item->orderItem->product_variant_id);
                    $this->inventoryService->adjust($inventory, (int) $item->quantity, 'return_restock', $actorId, $locked->code, $locked);
                    $updates['restocked_at'] = now();
                }
                $item->update($updates);
            }
            $locked->update(['status' => 'received', 'received_at' => now(), 'receiving_branch_id' => $receivingBranchId]);

            return $this->load($locked);
        });
    }

    public function complete(ReturnRequest $request): ReturnRequest
    {
        return $this->transition($request, ['received'], 'completed', ['completed_at' => now()]);
    }

    public function updateExchangeShipmentStatus(AfterSalesShipment $shipment, string $status, int $actorId): AfterSalesShipment
    {
        return DB::transaction(function () use ($shipment, $status, $actorId) {
            $lockedShipment = AfterSalesShipment::lockForUpdate()->findOrFail($shipment->id);
            if ($lockedShipment->purpose !== 'exchange_outbound') {
                throw ValidationException::withMessages(['purpose' => 'Shipment is not an exchange outbound shipment.']);
            }
            $return = ReturnRequest::with('order', 'items.orderItem')->lockForUpdate()->findOrFail($lockedShipment->return_request_id);
            if ($lockedShipment->status === $status) {
                return $lockedShipment;
            }
            if ($status === 'shipped') {
                if ($lockedShipment->status !== 'pending' || $return->status !== 'received') {
                    throw ValidationException::withMessages(['status' => 'Exchange shipment cannot be dispatched yet.']);
                }
                foreach ($return->items as $item) {
                    if ($item->replacement_consumed_at) {
                        continue;
                    }
                    if (! $item->replacement_reserved_at || $item->replacement_released_at) {
                        throw ValidationException::withMessages(['stock' => 'Replacement reservation is missing.']);
                    }
                    $inventory = Inventory::where('branch_id', $return->order->branch_id)->where('product_variant_id', $item->replacement_variant_id)->lockForUpdate()->firstOrFail();
                    $this->inventoryService->consumeReservation($inventory, (int) $item->quantity, 'exchange_consume', $actorId, $return, $return->code);
                    $item->update(['replacement_consumed_at' => now()]);
                }
                $lockedShipment->update(['status' => 'shipped', 'shipped_at' => now()]);
            } elseif ($status === 'delivered') {
                if ($lockedShipment->status !== 'shipped') {
                    throw ValidationException::withMessages(['status' => 'Exchange shipment must be shipped first.']);
                }
                $lockedShipment->update(['status' => 'delivered', 'delivered_at' => now()]);
                $return->update(['status' => 'completed', 'completed_at' => now()]);
            } else {
                throw ValidationException::withMessages(['status' => 'Invalid exchange shipment status.']);
            }

            return $lockedShipment->refresh();
        });
    }

    private function transition(ReturnRequest $request, array $from, string $to, array $updates = []): ReturnRequest
    {
        return DB::transaction(function () use ($request, $from, $to, $updates) {
            $locked = ReturnRequest::lockForUpdate()->findOrFail($request->id);
            if ($locked->status === $to) {
                return $this->load($locked);
            }
            if (! in_array($locked->status, $from, true)) {
                throw ValidationException::withMessages(['status' => 'Invalid return lifecycle transition.']);
            }
            $locked->update(['status' => $to] + array_filter($updates, fn ($value) => $value !== null));

            return $this->load($locked);
        });
    }

    private function closeBeforeDispatch(ReturnRequest $request, array $from, string $to, array $updates): ReturnRequest
    {
        return DB::transaction(function () use ($request, $from, $to, $updates) {
            $locked = ReturnRequest::with('order', 'items')->lockForUpdate()->findOrFail($request->id);
            if ($locked->status === $to) {
                return $this->load($locked);
            }
            if (! in_array($locked->status, $from, true)) {
                throw ValidationException::withMessages(['status' => 'Invalid return lifecycle transition.']);
            }
            if ($locked->request_type === 'exchange') {
                foreach ($locked->items as $item) {
                    if (! $item->replacement_reserved_at || $item->replacement_released_at || $item->replacement_consumed_at) {
                        continue;
                    }
                    $inventory = Inventory::where('branch_id', $locked->order->branch_id)->where('product_variant_id', $item->replacement_variant_id)->lockForUpdate()->firstOrFail();
                    $this->inventoryService->releaseReservation($inventory, (int) $item->quantity, 'exchange_release', null, $locked, $locked->code);
                    $item->update(['replacement_released_at' => now()]);
                }
            }
            $locked->update(['status' => $to] + array_filter($updates, fn ($value) => $value !== null));

            return $this->load($locked);
        });
    }

    private function load(ReturnRequest $request): ReturnRequest
    {
        return $request->refresh()->load('order.user', 'order.branch', 'order.payment', 'items.orderItem.product.images', 'items.orderItem.variant', 'items.replacementVariant', 'media', 'receivingBranch', 'shipments', 'refunds');
    }

    private function uniqueCode(): string
    {
        do {
            $code = 'RT-'.now()->format('ymd').'-'.strtoupper(Str::random(6));
        } while (ReturnRequest::where('code', $code)->exists());

        return $code;
    }

    private function minor(mixed $amount): int
    {
        return (int) round((float) $amount * 100);
    }
}
