<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        return $this->success($this->cartData($request));
    }

    public function store(Request $request)
    {
        $data = $request->validate(['product_variant_id' => ['required', 'exists:product_variants,id'], 'quantity' => ['required', 'integer', 'min:1']]);
        $variant = ProductVariant::with('inventories', 'product')->findOrFail($data['product_variant_id']);
        $cart = $request->user()->cart()->firstOrCreate();
        $existing = $cart->items()->where('product_variant_id', $variant->id)->first();
        $quantity = $data['quantity'] + ($existing?->quantity ?? 0);
        if ($variant->status !== 'active' || $variant->product->status !== 'active' || $quantity > $variant->availableStock()) {
            throw ValidationException::withMessages(['quantity' => 'Số lượng yêu cầu vượt quá tồn kho khả dụng.']);
        }
        $cart->items()->updateOrCreate(['product_variant_id' => $variant->id], ['quantity' => $quantity, 'unit_price' => $variant->currentPrice()]);

        return $this->success($this->cartData($request), 'Đã thêm sản phẩm vào giỏ hàng.', 201);
    }

    public function update(Request $request, int $id)
    {
        $quantity = $request->validate(['quantity' => ['required', 'integer', 'min:1']])['quantity'];
        $item = $request->user()->cart?->items()->with('variant.inventories')->findOrFail($id);
        if ($quantity > $item->variant->availableStock()) {
            throw ValidationException::withMessages(['quantity' => 'Số lượng vượt quá tồn kho khả dụng.']);
        }
        $item->update(['quantity' => $quantity, 'unit_price' => $item->variant->currentPrice()]);

        return $this->success($this->cartData($request), 'Đã cập nhật giỏ hàng.');
    }

    public function destroy(Request $request, int $id)
    {
        $request->user()->cart?->items()->findOrFail($id)->delete();

        return $this->success($this->cartData($request), 'Đã xóa sản phẩm.');
    }

    public function clear(Request $request)
    {
        $request->user()->cart?->items()->delete();

        return $this->success([], 'Đã xóa toàn bộ giỏ hàng.');
    }

    private function cartData(Request $request): array
    {
        $cart = $request->user()->cart()->with('items.variant.product.images', 'items.variant.inventories')->first();
        $items = $cart?->items ?? collect();

        return ['items' => $items, 'subtotal' => $items->sum(fn ($item) => $item->variant->currentPrice() * $item->quantity), 'count' => $items->sum('quantity')];
    }
}
