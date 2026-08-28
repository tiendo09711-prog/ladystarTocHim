<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PhaseOneTest extends TestCase
{
    use RefreshDatabase;

    private User $customer;

    private User $otherCustomer;

    private User $admin;

    private Product $product;

    private ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $this->otherCustomer = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $category = Category::create(['name' => 'Phase One', 'slug' => 'phase-one', 'is_active' => true]);
        $this->product = Product::create(['category_id' => $category->id, 'name' => 'Phase One Product', 'slug' => 'phase-one-product', 'base_sku' => 'PHASE-ONE', 'description' => 'Phase one test product', 'status' => 'active']);
        $this->variant = $this->product->variants()->create(['sku' => 'PHASE-ONE-SKU', 'price' => 100000, 'status' => 'active']);
    }

    public function test_customer_can_update_password_and_manage_addresses(): void
    {
        $this->actingAs($this->customer)->putJson('/api/v1/account/password', ['current_password' => 'wrong-password', 'password' => 'NewPassword123', 'password_confirmation' => 'NewPassword123'])
            ->assertUnprocessable()->assertJsonPath('errors.current_password.0', 'Mật khẩu hiện tại không đúng.');

        $this->actingAs($this->customer)->putJson('/api/v1/account/password', ['current_password' => 'password', 'password' => 'NewPassword123', 'password_confirmation' => 'NewPassword123'])->assertOk();
        $this->assertTrue(Hash::check('NewPassword123', $this->customer->refresh()->password));

        $first = $this->actingAs($this->customer)->postJson('/api/v1/account/addresses', $this->addressPayload('Địa chỉ một'))->assertCreated()->assertJsonPath('data.is_default', true);
        $second = $this->actingAs($this->customer)->postJson('/api/v1/account/addresses', $this->addressPayload('Địa chỉ hai'))->assertCreated();
        $firstId = $first->json('data.id');
        $secondId = $second->json('data.id');

        $this->actingAs($this->customer)->putJson('/api/v1/account/addresses/'.$secondId, $this->addressPayload('Địa chỉ hai đã sửa'))->assertOk()->assertJsonPath('data.address_line', 'Địa chỉ hai đã sửa');
        $this->actingAs($this->customer)->deleteJson('/api/v1/account/addresses/'.$firstId)->assertUnprocessable()->assertJsonPath('errors.address.0', 'Hãy chọn địa chỉ mặc định khác trước khi xóa.');
        $this->actingAs($this->customer)->patchJson('/api/v1/account/addresses/'.$secondId.'/default')->assertOk()->assertJsonPath('data.is_default', true);
        $this->actingAs($this->customer)->deleteJson('/api/v1/account/addresses/'.$firstId)->assertOk();
        $this->assertDatabaseMissing('addresses', ['id' => $firstId]);
    }

    public function test_review_requires_completed_owned_order_and_prevents_duplicates(): void
    {
        $pending = $this->createOrder($this->customer, 'pending', 'PENDING');
        $cancelled = $this->createOrder($this->customer, 'cancelled', 'CANCELLED');
        $other = $this->createOrder($this->otherCustomer, 'completed', 'OTHER');
        $completed = $this->createOrder($this->customer, 'completed', 'COMPLETED');

        foreach ([$pending, $cancelled, $other] as $order) {
            $this->actingAs($this->customer)->postJson('/api/v1/account/reviews', ['order_item_id' => $order->items->first()->id, 'rating' => 5, 'title' => 'Không hợp lệ'])
                ->assertUnprocessable()->assertJsonPath('errors.order_item_id.0', 'Chỉ có thể đánh giá sản phẩm trong đơn đã hoàn thành.');
        }

        $item = $completed->items->first();
        $created = $this->actingAs($this->customer)->postJson('/api/v1/account/reviews', ['order_item_id' => $item->id, 'rating' => 5, 'title' => 'Rất tốt', 'content' => 'Sản phẩm phù hợp.'])
            ->assertCreated()->assertJsonPath('data.status', 'pending');
        $this->actingAs($this->customer)->postJson('/api/v1/account/reviews', ['order_item_id' => $item->id, 'rating' => 4])
            ->assertUnprocessable()->assertJsonPath('errors.order_item_id.0', 'Sản phẩm trong đơn hàng này đã được đánh giá.');
        $this->actingAs($this->customer)->getJson('/api/v1/account/orders/'.$completed->order_number)
            ->assertOk()->assertJsonPath('data.items.0.review.id', $created->json('data.id'));
    }

    public function test_customer_can_update_and_delete_only_own_review(): void
    {
        $ownOrder = $this->createOrder($this->customer, 'completed', 'OWN-REVIEW');
        $otherOrder = $this->createOrder($this->otherCustomer, 'completed', 'OTHER-REVIEW');
        $ownReview = Review::create(['user_id' => $this->customer->id, 'product_id' => $this->product->id, 'order_item_id' => $ownOrder->items->first()->id, 'rating' => 5, 'status' => 'approved']);
        $otherReview = Review::create(['user_id' => $this->otherCustomer->id, 'product_id' => $this->product->id, 'order_item_id' => $otherOrder->items->first()->id, 'rating' => 4, 'status' => 'approved']);

        $this->actingAs($this->customer)->putJson('/api/v1/account/reviews/'.$ownReview->id, ['rating' => 3, 'title' => 'Đã sửa', 'content' => 'Nội dung mới'])->assertOk()->assertJsonPath('data.status', 'pending');
        $this->assertDatabaseHas('reviews', ['id' => $ownReview->id, 'rating' => 3, 'status' => 'pending']);
        $this->actingAs($this->customer)->putJson('/api/v1/account/reviews/'.$otherReview->id, ['rating' => 1])->assertNotFound();
        $this->actingAs($this->customer)->deleteJson('/api/v1/account/reviews/'.$otherReview->id)->assertNotFound();
        $this->actingAs($this->customer)->deleteJson('/api/v1/account/reviews/'.$ownReview->id)->assertOk();
        $this->assertDatabaseMissing('reviews', ['id' => $ownReview->id]);
    }

    public function test_admin_brand_crud_is_protected_and_public_api_only_lists_active_brands(): void
    {
        Brand::create(['name' => 'Public Brand', 'slug' => 'public-brand', 'is_active' => true]);
        Brand::create(['name' => 'Hidden Brand', 'slug' => 'hidden-brand', 'is_active' => false]);
        $this->getJson('/api/v1/brands')->assertOk()->assertJsonFragment(['slug' => 'public-brand'])->assertJsonMissing(['slug' => 'hidden-brand']);
        $this->getJson('/api/v1/admin/brands')->assertUnauthorized();
        $this->actingAs($this->customer)->getJson('/api/v1/admin/brands')->assertForbidden();

        $this->actingAs($this->admin)->getJson('/api/v1/admin/brands')->assertOk();
        $created = $this->actingAs($this->admin)->postJson('/api/v1/admin/brands', ['name' => 'Thương Hiệu Mới', 'slug' => '', 'description' => 'Mô tả', 'is_active' => true])
            ->assertCreated()->assertJsonPath('data.slug', 'thuong-hieu-moi');
        $brandId = $created->json('data.id');
        $this->actingAs($this->admin)->postJson('/api/v1/admin/brands', ['name' => 'Trùng slug', 'slug' => 'thuong-hieu-moi', 'is_active' => true])->assertUnprocessable();
        $this->actingAs($this->admin)->postJson('/api/v1/admin/brands', ['name' => 'Thương Hiệu Mới', 'slug' => '', 'is_active' => true])->assertUnprocessable();

        Brand::whereKey($brandId)->update(['logo_path' => '/logos/existing.svg']);
        $this->actingAs($this->admin)->putJson('/api/v1/admin/brands/'.$brandId, ['name' => 'Thương Hiệu Đã Sửa', 'slug' => '', 'description' => null, 'is_active' => false])
            ->assertOk()->assertJsonPath('data.slug', 'thuong-hieu-moi')->assertJsonPath('data.logo_path', '/logos/existing.svg')->assertJsonPath('data.is_active', false);
        $this->product->update(['brand_id' => $brandId]);
        $this->actingAs($this->admin)->deleteJson('/api/v1/admin/brands/'.$brandId)->assertOk();
        $this->assertNull($this->product->refresh()->brand_id);
    }

    public function test_only_admin_can_update_order_payment_status_and_internal_note(): void
    {
        $order = $this->createOrder($this->customer, 'pending', 'ADMIN-ORDER');
        $this->actingAs($this->customer)->patchJson('/api/v1/admin/orders/'.$order->id.'/payment-status', ['payment_status' => 'paid'])->assertForbidden();
        $this->actingAs($this->customer)->postJson('/api/v1/admin/orders/'.$order->id.'/notes', ['admin_note' => 'Không hợp lệ'])->assertForbidden();
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$order->id.'/payment-status', ['payment_status' => 'invalid'])->assertUnprocessable();
        $this->actingAs($this->admin)->patchJson('/api/v1/admin/orders/'.$order->id.'/payment-status', ['payment_status' => 'paid'])->assertOk()->assertJsonPath('data.payment_status', 'paid');
        $this->actingAs($this->admin)->postJson('/api/v1/admin/orders/'.$order->id.'/notes', ['admin_note' => 'Gọi khách trước khi giao.'])->assertOk()->assertJsonPath('data.admin_note', 'Gọi khách trước khi giao.');
    }

    private function addressPayload(string $addressLine): array
    {
        return ['recipient_name' => 'Nguyễn Văn A', 'phone' => '0900000000', 'province' => 'Hà Nội', 'district' => 'Ba Đình', 'ward' => 'Điện Biên', 'address_line' => $addressLine, 'postal_code' => '100000', 'is_default' => false];
    }

    private function createOrder(User $user, string $status, string $suffix): Order
    {
        $order = Order::create(['order_number' => 'PHASE1-'.$suffix, 'user_id' => $user->id, 'customer_name' => $user->name, 'customer_email' => $user->email, 'customer_phone' => '0900000000', 'province' => 'Test', 'district' => 'Test', 'ward' => 'Test', 'shipping_address' => 'Test address', 'subtotal' => 100000, 'discount_amount' => 0, 'shipping_fee' => 0, 'total_amount' => 100000, 'payment_method' => 'cod', 'payment_status' => 'unpaid', 'order_status' => $status, 'completed_at' => $status === 'completed' ? now() : null, 'cancelled_at' => $status === 'cancelled' ? now() : null]);
        $order->items()->create(['product_id' => $this->product->id, 'product_variant_id' => $this->variant->id, 'product_name' => $this->product->name, 'variant_description' => $this->variant->sku, 'sku' => $this->variant->sku, 'unit_price' => 100000, 'quantity' => 1, 'line_total' => 100000]);

        return $order->load('items');
    }
}
