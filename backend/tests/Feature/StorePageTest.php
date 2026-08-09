<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\StorePageContent;
use App\Models\StorePageItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorePageTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed();

        return User::where('role', 'admin')->firstOrFail();
    }

    public function test_public_store_page_returns_database_content_and_visible_branches(): void
    {
        $this->seed();
        Branch::firstOrFail()->update([
            'public_description' => 'Không gian tư vấn riêng tư.',
            'opening_hours' => '09:00 - 20:00',
            'latitude' => 10.7769,
            'longitude' => 106.7009,
        ]);
        Branch::create(['name' => 'Chi nhánh ẩn', 'code' => 'HIDDEN', 'is_active' => true, 'show_on_store_page' => false]);
        StorePageItem::where('item_type', 'policy')->firstOrFail()->update(['is_active' => false]);

        $response = $this->getJson('/api/v1/store-page')->assertOk();

        $response->assertJsonPath('data.content.title', 'Tìm điểm tư vấn gần bạn')
            ->assertJsonPath('data.branches.0.opening_hours', '09:00 - 20:00')
            ->assertJsonCount(5, 'data.steps')
            ->assertJsonCount(2, 'data.policies')
            ->assertJsonCount(1, 'data.branches');
    }

    public function test_admin_can_update_store_page_and_manage_items(): void
    {
        $admin = $this->admin();
        $content = StorePageContent::firstOrFail();

        $this->actingAs($admin)->putJson('/api/v1/admin/store-page', [
            'title' => 'Hệ thống trải nghiệm LADYSTARS',
            'settings' => ['services' => ['Tư vấn riêng'], 'form_submit_label' => 'Gửi lịch hẹn'],
            'seo' => ['title' => 'Địa điểm LADYSTARS', 'description' => 'Danh sách địa điểm tư vấn.'],
        ])->assertOk()->assertJsonPath('data.content.title', 'Hệ thống trải nghiệm LADYSTARS');

        $this->assertDatabaseHas('store_page_contents', ['id' => $content->id, 'title' => 'Hệ thống trải nghiệm LADYSTARS']);
        $this->assertDatabaseHas('page_seos', ['page_key' => 'he-thong-cua-hang', 'title' => 'Địa điểm LADYSTARS']);

        $created = $this->actingAs($admin)->postJson('/api/v1/admin/store-page/items', [
            'item_type' => 'policy', 'title' => 'Cam kết mới', 'description' => 'Nội dung mới.', 'icon' => 'shield-check', 'sort_order' => 9, 'is_active' => true,
        ])->assertCreated()->json('data');

        $this->actingAs($admin)->putJson('/api/v1/admin/store-page/items/'.$created['id'], [
            'item_type' => 'policy', 'title' => 'Cam kết đã sửa', 'description' => 'Nội dung đã sửa.', 'icon' => 'badge-check', 'sort_order' => 8, 'is_active' => true,
        ])->assertOk()->assertJsonPath('data.title', 'Cam kết đã sửa');
        $this->actingAs($admin)->patchJson('/api/v1/admin/store-page/items/'.$created['id'].'/status', ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
        $this->actingAs($admin)->deleteJson('/api/v1/admin/store-page/items/'.$created['id'])->assertOk();
        $this->assertDatabaseMissing('store_page_items', ['id' => $created['id']]);
    }

    public function test_admin_can_upload_page_item_and_branch_images(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        $item = StorePageItem::firstOrFail();
        $branch = Branch::firstOrFail();

        $this->actingAs($admin)->postJson('/api/v1/admin/store-page/images/hero', ['image' => UploadedFile::fake()->image('hero.jpg', 1200, 700)])->assertCreated();
        $this->actingAs($admin)->postJson('/api/v1/admin/store-page/items/'.$item->id.'/image', ['image' => UploadedFile::fake()->image('step.jpg', 600, 400)])->assertCreated();
        $this->actingAs($admin)->postJson('/api/v1/admin/store-page/branches/'.$branch->id.'/image', ['image' => UploadedFile::fake()->image('branch.jpg', 800, 600)])->assertCreated();

        Storage::disk('public')->assertExists(StorePageContent::firstOrFail()->hero_image_path);
        Storage::disk('public')->assertExists($item->fresh()->image_path);
        Storage::disk('public')->assertExists($branch->fresh()->image_path);
    }

    public function test_store_page_admin_endpoints_require_admin(): void
    {
        $this->getJson('/api/v1/admin/store-page')->assertUnauthorized();
        $this->seed();
        $user = User::where('role', 'user')->firstOrFail();
        $this->actingAs($user)->getJson('/api/v1/admin/store-page')->assertForbidden();
    }
}
