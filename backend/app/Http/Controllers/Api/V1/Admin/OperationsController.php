<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\OrderLifecycleService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OperationsController extends Controller
{
    use ApiResponse;

    public function __construct(private InventoryService $inventoryService, private OrderLifecycleService $orderLifecycleService) {}

    public function inventory(Request $request)
    {
        $query = Inventory::with('branch', 'variant.product');
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->integer('branch_id'));
        }
        if ($request->filled('search')) {
            $query->whereHas('variant', fn ($q) => $q->where('sku', 'like', '%'.$request->input('search').'%')->orWhereHas('product', fn ($p) => $p->where('name', 'like', '%'.$request->input('search').'%')));
        }

        return $this->success($query->paginate(25));
    }

    public function transactions(Request $request)
    {
        return $this->success(InventoryTransaction::with('branch', 'variant.product')->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))->latest('created_at')->paginate(30));
    }

    public function adjustInventory(Request $request)
    {
        $data = $request->validate(['branch_id' => ['required', 'exists:branches,id'], 'product_variant_id' => ['required', 'exists:product_variants,id'], 'quantity' => ['required', 'integer', 'not_in:0'], 'type' => ['required', Rule::in(['import', 'adjustment', 'return'])], 'note' => ['nullable', 'string']]);
        $inventory = $this->inventoryService->firstOrCreate($data['branch_id'], $data['product_variant_id']);

        return $this->success($this->inventoryService->adjust($inventory, $data['quantity'], $data['type'], $request->user()->id, $data['note'] ?? null), 'Điều chỉnh kho thành công.');
    }

    public function transferInventory(Request $request)
    {
        $data = $request->validate(['from_branch_id' => ['required', 'different:to_branch_id', 'exists:branches,id'], 'to_branch_id' => ['required', 'exists:branches,id'], 'product_variant_id' => ['required', 'exists:product_variants,id'], 'quantity' => ['required', 'integer', 'min:1'], 'note' => ['nullable', 'string']]);
        DB::transaction(function () use ($data, $request) {
            $from = Inventory::where('branch_id', $data['from_branch_id'])->where('product_variant_id', $data['product_variant_id'])->lockForUpdate()->firstOrFail();
            $to = Inventory::where('branch_id', $data['to_branch_id'])->where('product_variant_id', $data['product_variant_id'])->lockForUpdate()->first() ?? $this->inventoryService->create($data['to_branch_id'], $data['product_variant_id']);
            $this->inventoryService->adjust($from, -$data['quantity'], 'transfer_out', $request->user()->id, $data['note'] ?? null);
            $this->inventoryService->adjust($to, $data['quantity'], 'transfer_in', $request->user()->id, $data['note'] ?? null);
        });

        return $this->success(null, 'Chuyển kho thành công.');
    }

    public function lowStock()
    {
        return $this->success(Inventory::with('branch', 'variant.product')->whereRaw('(quantity_on_hand - quantity_reserved) <= reorder_level')->get());
    }

    public function orders(Request $request)
    {
        return $this->success(Order::with('user', 'items')->when($request->filled('status'), fn ($q) => $q->where('order_status', $request->input('status')))->latest()->paginate(20));
    }

    public function showOrder(Order $order)
    {
        return $this->success($order->load('user', 'branch', 'items.product.images'));
    }

    public function paymentStatus(Request $request, Order $order)
    {
        $order->update($request->validate(['payment_status' => ['required', Rule::in(['unpaid', 'paid', 'refunded'])]]));

        return $this->success($order);
    }

    public function notes(Request $request, Order $order)
    {
        $order->update($request->validate(['admin_note' => ['nullable', 'string', 'max:3000']]));

        return $this->success($order);
    }

    public function orderStatus(Request $request, Order $order)
    {
        $status = $request->validate(['order_status' => ['required', Rule::in(['pending', 'confirmed', 'processing', 'shipping', 'completed', 'cancelled'])]])['order_status'];
        $order = $this->orderLifecycleService->transition($order, OrderStatus::from($status), $request->user()->id);

        return $this->success($order, 'Cập nhật trạng thái đơn hàng thành công.');
    }

    public function cancelOrder(Request $request, Order $order)
    {
        $request->merge(['order_status' => 'cancelled']);

        return $this->orderStatus($request, $order);
    }

    public function customers(Request $request)
    {
        return $this->success(User::where('role', 'user')->withCount('orders')->when($request->filled('search'), fn ($q) => $q->where(fn ($search) => $search->where('name', 'like', '%'.$request->input('search').'%')->orWhere('email', 'like', '%'.$request->input('search').'%')->orWhere('phone', 'like', '%'.$request->input('search').'%')))->latest()->paginate(20));
    }

    public function showCustomer(User $user)
    {
        abort_if($user->isAdmin(), 404);

        return $this->success($user->load('addresses', 'orders.items'));
    }

    public function customerStatus(Request $request, User $user)
    {
        abort_if($user->isAdmin(), 422);
        $user->update($request->validate(['status' => ['required', Rule::in(['active', 'blocked'])]]));

        return $this->success($user);
    }

    public function reviews(Request $request)
    {
        return $this->success(Review::with('user', 'product')->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))->when($request->filled('rating'), fn ($q) => $q->where('rating', $request->integer('rating')))->latest()->paginate(20));
    }

    public function reviewStatus(Request $request, Review $review)
    {
        $review->update($request->validate(['status' => ['required', Rule::in(['pending', 'approved', 'rejected'])], 'admin_reply' => ['nullable', 'string']]));

        return $this->success($review);
    }

    public function deleteReview(Review $review)
    {
        $review->delete();

        return $this->success(null);
    }

    public function coupons()
    {
        return $this->success(Coupon::latest()->paginate(20));
    }

    public function storeCoupon(Request $request)
    {
        $coupon = Coupon::create($this->couponData($request));

        return $this->success($coupon, 'Tạo mã giảm giá thành công.', 201);
    }

    public function updateCoupon(Request $request, Coupon $coupon)
    {
        $coupon->update($this->couponData($request, $coupon));

        return $this->success($coupon);
    }

    public function deleteCoupon(Coupon $coupon)
    {
        $coupon->delete();

        return $this->success(null);
    }

    public function barcodes()
    {
        return $this->success(ProductVariant::with('product')->orderBy('sku')->get());
    }

    public function generateBarcode(ProductVariant $variant)
    {
        if (! $variant->barcode) {
            $variant->update(['barcode' => '893'.str_pad((string) $variant->id, 10, '0', STR_PAD_LEFT)]);
        }

        return $this->success($variant);
    }

    public function importProducts(Request $request)
    {
        $rows = $request->validate(['rows' => ['required', 'array', 'min:1', 'max:500'], 'rows.*.name' => ['required', 'string'], 'rows.*.base_sku' => ['required', 'string'], 'rows.*.variant_sku' => ['required', 'string'], 'rows.*.price' => ['required', 'numeric', 'min:0'], 'rows.*.stock_quantity' => ['nullable', 'integer', 'min:0']])['rows'];
        $errors = [];
        $created = 0;
        foreach ($rows as $index => $row) {
            try {
                DB::transaction(function () use ($row, &$created) {
                    if (Product::where('base_sku', $row['base_sku'])->exists() || ProductVariant::where('sku', $row['variant_sku'])->exists()) {
                        throw ValidationException::withMessages(['sku' => 'SKU đã tồn tại.']);
                    }
                    $category = Category::firstOrCreate(['slug' => Str::slug($row['category'] ?? 'Chưa phân loại')], ['name' => $row['category'] ?? 'Chưa phân loại', 'is_active' => true]);
                    $product = Product::create(['category_id' => $category->id, 'name' => $row['name'], 'slug' => Str::slug($row['name']).'-'.strtolower($row['base_sku']), 'base_sku' => $row['base_sku'], 'description' => $row['description'] ?? $row['name'], 'material' => $row['material'] ?? null, 'base_type' => $row['base_type'] ?? null, 'status' => $row['status'] ?? 'active', 'published_at' => now()]);
                    $variant = $product->variants()->create(['sku' => $row['variant_sku'], 'barcode' => $row['barcode'] ?? null, 'price' => $row['price'], 'sale_price' => $row['sale_price'] ?? null, 'status' => 'active']);
                    $branch = Branch::where('code', $row['branch_code'] ?? 'MAIN')->firstOrFail();
                    $this->inventoryService->create($branch->id, $variant->id, $row['stock_quantity'] ?? 0);
                    $created++;
                });
            } catch (\Throwable $exception) {
                $errors[] = ['row' => $index + 2, 'message' => $exception->getMessage()];
            }
        }

        return $this->success(['created' => $created, 'failed' => count($errors), 'errors' => $errors], 'Đã xử lý dữ liệu import.');
    }

    public function settings()
    {
        return $this->success(StoreSetting::current());
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'store_name' => ['required', 'string', 'max:190'],
            'support_phone' => ['nullable', 'string', 'max:30'],
            'support_email' => ['nullable', 'email', 'max:190'],
            'store_address' => ['nullable', 'string', 'max:1000'],
            'currency' => ['required', Rule::in(['VND'])],
            'shipping_fee' => ['required', 'numeric', 'min:0'],
            'free_shipping_from' => ['required', 'numeric', 'min:0'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'order_prefix' => ['required', 'alpha_num', 'max:12'],
        ]);
        $settings = StoreSetting::current();
        $settings->update($data);

        return $this->success($settings->refresh(), 'Đã lưu cấu hình cửa hàng.');
    }

    public function export(string $resource)
    {
        abort_unless(in_array($resource, ['products', 'orders', 'inventory', 'customers'], true), 404);

        $rows = match ($resource) {
            'products' => ProductVariant::with('product.category')->orderBy('id')->get()->map(fn ($variant) => [
                'product_id' => $variant->product_id,
                'name' => $variant->product->name,
                'base_sku' => $variant->product->base_sku,
                'category' => $variant->product->category?->name,
                'variant_sku' => $variant->sku,
                'barcode' => $variant->barcode,
                'price' => (float) $variant->price,
                'sale_price' => $variant->sale_price !== null ? (float) $variant->sale_price : null,
                'status' => $variant->status,
            ]),
            'orders' => Order::with('user')->latest()->get()->map(fn ($order) => [
                'order_number' => $order->order_number,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->customer_email,
                'customer_phone' => $order->customer_phone,
                'subtotal' => (float) $order->subtotal,
                'discount_amount' => (float) $order->discount_amount,
                'shipping_fee' => (float) $order->shipping_fee,
                'total_amount' => (float) $order->total_amount,
                'payment_status' => $order->payment_status,
                'order_status' => $order->order_status,
                'created_at' => $order->created_at?->toDateTimeString(),
            ]),
            'inventory' => Inventory::with('branch', 'variant.product')->orderBy('branch_id')->get()->map(fn ($inventory) => [
                'branch' => $inventory->branch->name,
                'product' => $inventory->variant->product->name,
                'sku' => $inventory->variant->sku,
                'quantity_on_hand' => $inventory->quantity_on_hand,
                'quantity_reserved' => $inventory->quantity_reserved,
                'quantity_available' => $inventory->quantity_on_hand - $inventory->quantity_reserved,
                'reorder_level' => $inventory->reorder_level,
            ]),
            'customers' => User::where('role', 'user')->withCount('orders')->latest()->get()->map(fn ($user) => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'orders_count' => $user->orders_count,
                'created_at' => $user->created_at?->toDateTimeString(),
            ]),
        };

        return $this->success($rows);
    }

    private function couponData(Request $request, ?Coupon $coupon = null): array
    {
        $data = $request->validate(['code' => ['required', 'string', Rule::unique('coupons')->ignore($coupon)], 'type' => ['required', Rule::in(['fixed', 'percentage'])], 'value' => ['required', 'numeric', 'min:0'], 'minimum_order_amount' => ['nullable', 'numeric', 'min:0'], 'maximum_discount_amount' => ['nullable', 'numeric', 'min:0'], 'usage_limit' => ['nullable', 'integer', 'min:1'], 'usage_limit_per_user' => ['nullable', 'integer', 'min:1'], 'starts_at' => ['nullable', 'date'], 'expires_at' => ['nullable', 'date', 'after:starts_at'], 'is_active' => ['boolean']]);
        $data['code'] = strtoupper($data['code']);

        return $data;
    }
}
