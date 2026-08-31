<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Order;
use App\Models\StoreSetting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function adjust(Inventory $inventory, int $quantity, string $type, ?int $performedBy = null, ?string $note = null, ?Model $reference = null, ?string $reasonCode = null): Inventory
    {
        $before = $inventory->quantity_on_hand;
        $after = $before + $quantity;
        if ($after < 0 || $after < $inventory->quantity_reserved) {
            throw ValidationException::withMessages(['quantity' => 'Số lượng điều chỉnh làm tồn kho khả dụng bị âm.']);
        }
        $inventory->update(['quantity_on_hand' => $after]);
        InventoryTransaction::create([
            'branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id,
            'type' => $type, 'quantity' => $quantity, 'quantity_before' => $before, 'quantity_after' => $after,
            'reference_type' => $reference ? $reference::class : null, 'reference_id' => $reference?->getKey(),
            'note' => $note, 'performed_by' => $performedBy, 'reason_code' => $reasonCode,
        ]);

        return $inventory->refresh();
    }

    public function reserve(Inventory $inventory, int $quantity, ?int $userId = null, ?Order $order = null): void
    {
        $this->reserveForReference($inventory, $quantity, 'sale_reserve', $userId, $order);
    }

    public function reserveForReference(Inventory $inventory, int $quantity, string $type, ?int $userId = null, ?Model $reference = null, ?string $note = null): void
    {
        if (($inventory->quantity_on_hand - $inventory->quantity_reserved) < $quantity) {
            throw ValidationException::withMessages(['stock' => 'Sản phẩm không đủ tồn kho khả dụng.']);
        }
        $inventory->increment('quantity_reserved', $quantity);
        InventoryTransaction::create([
            'branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id,
            'type' => $type, 'quantity' => $quantity, 'quantity_before' => $inventory->quantity_on_hand,
            'quantity_after' => $inventory->quantity_on_hand, 'reference_type' => $reference ? $reference::class : null,
            'reference_id' => $reference?->getKey(), 'performed_by' => $userId, 'note' => $note,
        ]);
    }

    public function releaseReservation(Inventory $inventory, int $quantity, string $type, ?int $userId = null, ?Model $reference = null, ?string $note = null): void
    {
        if ($inventory->quantity_reserved < $quantity) {
            throw ValidationException::withMessages(['stock' => 'Reserved inventory is inconsistent.']);
        }
        $inventory->decrement('quantity_reserved', $quantity);
        InventoryTransaction::create([
            'branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id,
            'type' => $type, 'quantity' => $quantity, 'quantity_before' => $inventory->quantity_on_hand,
            'quantity_after' => $inventory->quantity_on_hand, 'reference_type' => $reference ? $reference::class : null,
            'reference_id' => $reference?->getKey(), 'performed_by' => $userId, 'note' => $note,
        ]);
    }

    public function consumeReservation(Inventory $inventory, int $quantity, string $type, ?int $userId = null, ?Model $reference = null, ?string $note = null): void
    {
        if ($inventory->quantity_reserved < $quantity || $inventory->quantity_on_hand < $quantity) {
            throw ValidationException::withMessages(['stock' => 'Reserved inventory cannot be consumed.']);
        }
        $before = $inventory->quantity_on_hand;
        $inventory->update(['quantity_on_hand' => $before - $quantity, 'quantity_reserved' => $inventory->quantity_reserved - $quantity]);
        InventoryTransaction::create([
            'branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id,
            'type' => $type, 'quantity' => -$quantity, 'quantity_before' => $before, 'quantity_after' => $before - $quantity,
            'reference_type' => $reference ? $reference::class : null, 'reference_id' => $reference?->getKey(),
            'performed_by' => $userId, 'note' => $note,
        ]);
    }

    public function firstOrCreate(int $branchId, int $variantId): Inventory
    {
        return Inventory::firstOrCreate(
            ['branch_id' => $branchId, 'product_variant_id' => $variantId],
            $this->initialValues(),
        );
    }

    public function create(int $branchId, int $variantId, int $quantityOnHand = 0): Inventory
    {
        return Inventory::create([
            'branch_id' => $branchId,
            'product_variant_id' => $variantId,
            ...$this->initialValues($quantityOnHand),
        ]);
    }

    public function defaultReorderLevel(): int
    {
        $threshold = StoreSetting::current()->low_stock_threshold;

        return is_numeric($threshold) && (int) $threshold >= 0 ? (int) $threshold : 0;
    }

    private function initialValues(int $quantityOnHand = 0): array
    {
        return [
            'quantity_on_hand' => $quantityOnHand,
            'quantity_reserved' => 0,
            'reorder_level' => $this->defaultReorderLevel(),
        ];
    }
}
