<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AccountController extends Controller
{
    use ApiResponse;

    public function profile(Request $request)
    {
        return $this->success($request->user());
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'regex:/^[0-9+\s.-]{9,20}$/', 'unique:users,phone,'.$request->user()->id],
        ]);
        $request->user()->update($data);

        return $this->success($request->user()->refresh(), 'Cập nhật hồ sơ thành công.');
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate(['current_password' => ['required'], 'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()]]);
        if (! Hash::check($data['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages(['current_password' => 'Mật khẩu hiện tại không đúng.']);
        }
        $request->user()->update(['password' => $data['password']]);

        return $this->success(null, 'Đổi mật khẩu thành công.');
    }

    public function addresses(Request $request)
    {
        return $this->success($request->user()->addresses()->orderByDesc('is_default')->get());
    }

    public function storeAddress(Request $request)
    {
        $data = $this->addressData($request);
        $address = DB::transaction(function () use ($request, $data) {
            if (($data['is_default'] ?? false) || ! $request->user()->addresses()->exists()) {
                $request->user()->addresses()->update(['is_default' => false]);
                $data['is_default'] = true;
            }

            return $request->user()->addresses()->create($data);
        });

        return $this->success($address, 'Thêm địa chỉ thành công.', 201);
    }

    public function updateAddress(Request $request, int $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        $data = $this->addressData($request);
        DB::transaction(function () use ($request, $address, $data) {
            if ($data['is_default'] ?? false) {
                $request->user()->addresses()->whereKeyNot($address->id)->update(['is_default' => false]);
            }
            $address->update($data);
        });

        return $this->success($address->refresh(), 'Cập nhật địa chỉ thành công.');
    }

    public function deleteAddress(Request $request, int $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        if ($address->is_default && $request->user()->addresses()->count() > 1) {
            throw ValidationException::withMessages(['address' => 'Hãy chọn địa chỉ mặc định khác trước khi xóa.']);
        }
        $address->delete();

        return $this->success(null, 'Đã xóa địa chỉ.');
    }

    public function defaultAddress(Request $request, int $id)
    {
        $address = $request->user()->addresses()->findOrFail($id);
        DB::transaction(function () use ($request, $address) {
            $request->user()->addresses()->update(['is_default' => false]);
            $address->update(['is_default' => true]);
        });

        return $this->success($address->refresh(), 'Đã đặt địa chỉ mặc định.');
    }

    public function wishlist(Request $request)
    {
        return $this->success(Product::whereIn('id', DB::table('wishlists')->where('user_id', $request->user()->id)->pluck('product_id'))->with('images', 'variants.inventories')->get());
    }

    public function addWishlist(Request $request, Product $product)
    {
        DB::table('wishlists')->insertOrIgnore(['user_id' => $request->user()->id, 'product_id' => $product->id, 'created_at' => now()]);

        return $this->success(null, 'Đã thêm vào danh sách yêu thích.', 201);
    }

    public function removeWishlist(Request $request, Product $product)
    {
        DB::table('wishlists')->where('user_id', $request->user()->id)->where('product_id', $product->id)->delete();

        return $this->success(null, 'Đã xóa khỏi danh sách yêu thích.');
    }

    public function storeReview(Request $request)
    {
        $data = $request->validate(['order_item_id' => ['required', 'exists:order_items,id'], 'rating' => ['required', 'integer', 'between:1,5'], 'title' => ['nullable', 'string', 'max:190'], 'content' => ['nullable', 'string', 'max:3000']]);
        $item = OrderItem::whereKey($data['order_item_id'])->whereHas('order', fn ($q) => $q->where('user_id', $request->user()->id)->where('order_status', 'completed'))->first();
        if (! $item) {
            throw ValidationException::withMessages(['order_item_id' => 'Chỉ có thể đánh giá sản phẩm trong đơn đã hoàn thành.']);
        }
        if ($item->review()->exists()) {
            throw ValidationException::withMessages(['order_item_id' => 'Sản phẩm trong đơn hàng này đã được đánh giá.']);
        }
        $review = Review::create(array_merge($data, ['user_id' => $request->user()->id, 'product_id' => $item->product_id, 'status' => 'pending']));

        return $this->success($review, 'Đánh giá đã được gửi để duyệt.', 201);
    }

    public function updateReview(Request $request, int $id)
    {
        $review = Review::where('user_id', $request->user()->id)->findOrFail($id);
        $review->update(array_merge($request->validate(['rating' => ['required', 'integer', 'between:1,5'], 'title' => ['nullable', 'string'], 'content' => ['nullable', 'string']]), ['status' => 'pending']));

        return $this->success($review, 'Đã cập nhật đánh giá.');
    }

    public function deleteReview(Request $request, int $id)
    {
        Review::where('user_id', $request->user()->id)->findOrFail($id)->delete();

        return $this->success(null, 'Đã xóa đánh giá.');
    }

    private function addressData(Request $request): array
    {
        return $request->validate([
            'recipient_name' => ['required', 'string', 'max:120'], 'phone' => ['required', 'regex:/^[0-9+\s.-]{9,20}$/'],
            'province' => ['required', 'string'], 'district' => ['required', 'string'], 'ward' => ['required', 'string'],
            'address_line' => ['required', 'string', 'max:255'], 'postal_code' => ['nullable', 'string', 'max:20'], 'is_default' => ['boolean'],
        ]);
    }
}
