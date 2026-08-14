<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryTransaction;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function adjust(Inventory $inventory, int $quantity, string $type, ?int $performedBy = null, ?string $note = null): Inventory
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
            'note' => $note, 'performed_by' => $performedBy,
        ]);

        return $inventory->refresh();
    }

    public function reserve(Inventory $inventory, int $quantity, ?int $userId = null): void
    {
        if (($inventory->quantity_on_hand - $inventory->quantity_reserved) < $quantity) {
            throw ValidationException::withMessages(['stock' => 'Sản phẩm không đủ tồn kho khả dụng.']);
        }
        $inventory->increment('quantity_reserved', $quantity);
        InventoryTransaction::create([
            'branch_id' => $inventory->branch_id, 'product_variant_id' => $inventory->product_variant_id,
            'type' => 'sale_reserve', 'quantity' => $quantity, 'quantity_before' => $inventory->quantity_on_hand,
            'quantity_after' => $inventory->quantity_on_hand, 'performed_by' => $userId,
        ]);
    }
}
