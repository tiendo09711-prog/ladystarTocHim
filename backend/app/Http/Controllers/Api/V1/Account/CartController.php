<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Services\CartService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    use ApiResponse;

    public function __construct(private CartService $cart) {}

    public function index(Request $request)
    {
        return $this->success($this->cart->data($request->user()));
    }

    public function store(Request $request)
    {
        $data = $request->validate(['product_variant_id' => ['required', 'exists:product_variants,id'], 'quantity' => ['required', 'integer', 'min:1']]);
        $variant = ProductVariant::with('inventories', 'product')->findOrFail($data['product_variant_id']);

        return $this->success($this->cart->add($request->user(), $variant, (int) $data['quantity']), 'Đã thêm sản phẩm vào giỏ hàng.', 201);
    }

    public function update(Request $request, int $id)
    {
        $quantity = $request->validate(['quantity' => ['required', 'integer', 'min:1']])['quantity'];
        $item = $request->user()->cart?->items()->with('variant.inventories')->findOrFail($id);
        if ($quantity > $item->variant->availableStock()) {
            throw ValidationException::withMessages(['quantity' => 'Số lượng vượt quá tồn kho khả dụng.']);
        }
        $item->update(['quantity' => $quantity, 'unit_price' => $item->variant->currentPrice()]);

        return $this->success($this->cart->data($request->user()), 'Đã cập nhật giỏ hàng.');
    }

    public function destroy(Request $request, int $id)
    {
        $request->user()->cart?->items()->findOrFail($id)->delete();

        return $this->success($this->cart->data($request->user()), 'Đã xóa sản phẩm.');
    }

    public function clear(Request $request)
    {
        $request->user()->cart?->items()->delete();

        return $this->success([], 'Đã xóa toàn bộ giỏ hàng.');
    }

}
