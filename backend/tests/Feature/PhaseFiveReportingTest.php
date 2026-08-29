<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Refund;
use App\Models\ReturnItem;
use App\Models\ReturnRequest;
use App\Models\Service;
use App\Models\StaffRole;
use App\Models\User;
use App\Models\WarrantyRequest;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseFiveReportingTest extends TestCase
{
    use RefreshDatabase;

    public function test_overview_uses_completed_dates_refunds_branch_filter_and_safe_aov(): void
    {
        $data = $this->fixture();
        $admin = User::factory()->admin()->create();

        $overview = $this->actingAs($admin)->getJson('/api/v1/admin/reports/overview?date_from=2026-08-01&date_to=2026-08-31')
            ->assertOk()->json('data');
        $this->assertEquals(1000000.0, $overview['gross_sales']);
        $this->assertEquals(200000.0, $overview['refunds']);
        $this->assertEquals(800000.0, $overview['net_revenue']);
        $this->assertSame(1, $overview['completed_orders']);
        $this->assertEquals(1000000.0, $overview['aov_gross']);
        $this->assertEquals(800000.0, $overview['aov_net']);
        $this->assertEquals(400000.0, $overview['gross_cogs']);
        $this->assertEquals(200000.0, $overview['recovered_cogs']);
        $this->assertEquals(600000.0, $overview['gross_profit_estimate']);
        $this->assertSame(1, $overview['cost_data_quality']['snapshot_items']);

        $this->actingAs($admin)->getJson('/api/v1/admin/reports/overview?date_from=2026-08-01&date_to=2026-08-31&branch_id='.$data['otherBranch']->id)
            ->assertOk()->assertJsonPath('data.gross_sales', 0)->assertJsonPath('data.aov_net', 0);

        $sales = $this->actingAs($admin)->getJson('/api/v1/admin/reports/sales?date_from=2026-08-20&date_to=2026-08-22')->assertOk()->json('data.data');
        $this->assertEquals(1000000.0, collect($sales)->firstWhere('date', '2026-08-20')['gross_sales']);
        $this->assertEquals(200000.0, collect($sales)->firstWhere('date', '2026-08-22')['refunds']);
    }

    public function test_product_inventory_and_customer_reports_return_required_insights(): void
    {
        $data = $this->fixture();
        $admin = User::factory()->admin()->create();
        $period = 'date_from=2026-08-01&date_to=2026-08-31';

        $product = $this->actingAs($admin)->getJson('/api/v1/admin/reports/products?'.$period.'&category_id='.$data['category']->id.'&brand_id='.$data['brand']->id)
            ->assertOk()->json('data.rows.data.0');
        $this->assertSame(2, $product['quantity_sold']);
        $this->assertSame(1, $product['completed_return_quantity']);
        $this->assertSame(0.5, $product['return_rate']);
        $this->assertEquals(600000.0, $product['estimated_profit']);
        $this->assertNotNull($product['last_sold_at']);

        $inventory = $this->actingAs($admin)->getJson('/api/v1/admin/reports/inventory?'.$period.'&branch_id='.$data['branch']->id)->assertOk()->json('data');
        $this->assertEquals(1200000.0, $inventory['summary']['inventory_value']);
        $this->assertSame(2, $inventory['rows']['data'][0]['quantity_available']);
        $this->assertSame(2, $inventory['rows']['data'][0]['sold_30d']);

        $customer = $this->actingAs($admin)->getJson('/api/v1/admin/reports/customers?'.$period.'&search='.urlencode($data['customer']->email))->assertOk()->json('data.data.0');
        $this->assertSame($data['customer']->id, $customer['id']);
        $this->assertSame(1, $customer['completed_orders']);
        $this->assertEquals(800000.0, $customer['net_spend']);
        $this->assertSame(1, $customer['completed_return_requests']);
        $this->assertSame(1, $customer['warranty_count']);
        $this->assertSame(1, $customer['appointment_count']);
    }

    public function test_reports_permission_is_enforced_for_staff_and_customers(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->admin()->create();
        $staff = User::factory()->staff()->create();
        $manager = StaffRole::where('slug', 'manager')->firstOrFail();
        $staff->staffRoles()->attach($manager);
        $withoutPermission = User::factory()->staff()->create();
        $customer = User::factory()->customer()->create();

        $this->actingAs($admin)->getJson('/api/v1/admin/reports/overview')->assertOk();
        $this->actingAs($staff)->getJson('/api/v1/admin/reports/overview')->assertOk();
        $this->actingAs($withoutPermission)->getJson('/api/v1/admin/reports/overview')->assertForbidden();
        $this->actingAs($customer)->getJson('/api/v1/admin/reports/overview')->assertForbidden();
    }

    private function fixture(): array
    {
        $branch = Branch::create(['name' => 'Chi nhánh chính', 'code' => 'MAIN', 'is_default' => true, 'is_active' => true]);
        $otherBranch = Branch::create(['name' => 'Chi nhánh khác', 'code' => 'OTHER', 'is_default' => false, 'is_active' => true]);
        $category = Category::create(['name' => 'Tóc', 'slug' => 'toc', 'is_active' => true]);
        $brand = Brand::create(['name' => 'LADYSTARS', 'slug' => 'ladystars', 'is_active' => true]);
        $product = Product::create(['category_id' => $category->id, 'brand_id' => $brand->id, 'name' => 'Sản phẩm báo cáo', 'slug' => 'san-pham-bao-cao', 'base_sku' => 'REPORT', 'description' => 'Report', 'status' => 'active']);
        $variant = ProductVariant::create(['product_id' => $product->id, 'sku' => 'REPORT-01', 'price' => 500000, 'cost_price' => 300000, 'status' => 'active']);
        Inventory::create(['branch_id' => $branch->id, 'product_variant_id' => $variant->id, 'quantity_on_hand' => 4, 'quantity_reserved' => 2, 'reorder_level' => 2]);
        $customer = User::factory()->customer()->create();

        $order = $this->order($customer, $branch, 'REPORT-COMPLETED', 'completed', '2026-08-20 10:00:00', 1000000);
        $item = $order->items()->create(['product_id' => $product->id, 'product_variant_id' => $variant->id, 'product_name' => $product->name, 'sku' => $variant->sku, 'unit_price' => 500000, 'cost_price_snapshot' => 200000, 'quantity' => 2, 'line_total' => 1000000]);
        $payment = Payment::create(['order_id' => $order->id, 'method' => 'cod', 'provider' => 'manual', 'amount' => 1000000, 'status' => 'paid', 'paid_at' => '2026-08-20 10:00:00']);
        Refund::create(['code' => 'RF-COMPLETED', 'order_id' => $order->id, 'payment_id' => $payment->id, 'amount' => 200000, 'status' => 'completed', 'method' => 'manual', 'requested_at' => '2026-08-21 10:00:00', 'completed_at' => '2026-08-22 10:00:00']);
        Refund::create(['code' => 'RF-PENDING', 'order_id' => $order->id, 'payment_id' => $payment->id, 'amount' => 100000, 'status' => 'pending', 'method' => 'manual', 'requested_at' => '2026-08-23 10:00:00']);
        $return = ReturnRequest::create(['code' => 'RET-REPORT', 'order_id' => $order->id, 'user_id' => $customer->id, 'request_type' => 'return', 'status' => 'completed', 'requested_at' => '2026-08-20', 'completed_at' => '2026-08-24']);
        ReturnItem::create(['return_request_id' => $return->id, 'order_item_id' => $item->id, 'quantity' => 1, 'reason_code' => 'fit', 'restockable' => true, 'restocked_at' => '2026-08-24']);
        WarrantyRequest::create(['code' => 'WAR-REPORT', 'order_id' => $order->id, 'order_item_id' => $item->id, 'user_id' => $customer->id, 'status' => 'requested', 'issue_type' => 'quality', 'description' => 'Issue', 'requested_at' => '2026-08-25']);
        $service = Service::create(['name' => 'Tư vấn', 'slug' => 'tu-van', 'price' => 0, 'duration_minutes' => 30, 'status' => 'active']);
        Appointment::create(['code' => 'APT-REPORT', 'user_id' => $customer->id, 'branch_id' => $branch->id, 'service_id' => $service->id, 'customer_name' => $customer->name, 'customer_phone' => '0900000000', 'start_at' => '2026-08-26 09:00:00', 'end_at' => '2026-08-26 09:30:00', 'status' => 'confirmed', 'source' => 'customer']);

        $pending = $this->order($customer, $branch, 'REPORT-PENDING', 'pending', null, 900000);
        $pending->items()->create(['product_id' => $product->id, 'product_variant_id' => $variant->id, 'product_name' => $product->name, 'sku' => $variant->sku, 'unit_price' => 900000, 'quantity' => 1, 'line_total' => 900000]);
        $this->order($customer, $branch, 'REPORT-CANCELLED', 'cancelled', null, 800000, '2026-08-18 10:00:00');

        return compact('branch', 'otherBranch', 'category', 'brand', 'product', 'variant', 'customer');
    }

    private function order(User $customer, Branch $branch, string $number, string $status, ?string $completedAt, int $total, ?string $cancelledAt = null): Order
    {
        return Order::create([
            'order_number' => $number, 'user_id' => $customer->id, 'branch_id' => $branch->id,
            'customer_name' => $customer->name, 'customer_email' => $customer->email, 'customer_phone' => '0900000000',
            'province' => 'Hà Nội', 'district' => 'Ba Đình', 'ward' => 'Điện Biên', 'shipping_address' => '1 Đường Mẫu',
            'subtotal' => $total, 'discount_amount' => 0, 'shipping_fee' => 0, 'total_amount' => $total,
            'payment_method' => 'cod', 'payment_status' => $status === 'completed' ? 'paid' : 'unpaid',
            'order_status' => $status, 'completed_at' => $completedAt, 'cancelled_at' => $cancelledAt,
        ]);
    }
}
