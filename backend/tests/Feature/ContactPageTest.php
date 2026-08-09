<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ContactPageContent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContactPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_contact_page_uses_database_store_and_branch_data(): void
    {
        $this->seed();
        Branch::firstOrFail()->update(['opening_hours' => '09:00 - 19:30', 'map_url' => 'https://maps.example.test']);

        $this->getJson('/api/v1/contact-page')
            ->assertOk()
            ->assertJsonPath('data.content.hero_title', 'Mỗi lựa chọn đẹp bắt đầu từ một cuộc trò chuyện')
            ->assertJsonPath('data.store.store_name', 'Nam Hair')
            ->assertJsonPath('data.branches.0.opening_hours', '09:00 - 19:30')
            ->assertJsonPath('data.content.settings.commitments.0.title', 'Tư vấn theo nhu cầu');
    }

    public function test_admin_can_update_contact_page_and_upload_images(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();

        $this->actingAs($admin)->putJson('/api/v1/admin/contact-page', [
            'hero_title' => 'Kết nối theo cách của bạn',
            'settings' => [
                'services' => ['Tư vấn riêng'],
                'commitments' => [['icon' => 'sparkles', 'title' => 'Lắng nghe', 'description' => 'Tôn trọng nhu cầu riêng.']],
                'guide_points' => ['Xác minh thông tin trên website.'],
            ],
            'seo' => ['title' => 'Kết nối LADYSTARS', 'description' => 'Trang liên hệ LADYSTARS.'],
        ])->assertOk()->assertJsonPath('data.content.hero_title', 'Kết nối theo cách của bạn');

        $this->actingAs($admin)->postJson('/api/v1/admin/contact-page/images/hero', [
            'image' => UploadedFile::fake()->image('contact.jpg', 1440, 900),
        ])->assertCreated();

        Storage::disk('public')->assertExists(ContactPageContent::firstOrFail()->hero_image_path);
        $this->assertDatabaseHas('page_seos', ['page_key' => 'lien-he', 'title' => 'Kết nối LADYSTARS']);
    }

    public function test_contact_page_admin_requires_admin(): void
    {
        $this->getJson('/api/v1/admin/contact-page')->assertUnauthorized();
        $this->seed();
        $this->actingAs(User::where('role', 'user')->firstOrFail())->getJson('/api/v1/admin/contact-page')->assertForbidden();
    }

    public function test_contact_form_stores_service_and_branch_context(): void
    {
        $this->seed();
        $branch = Branch::firstOrFail();

        $this->postJson('/api/v1/consultation-requests', [
            'name' => 'Khách liên hệ',
            'phone' => '0900000000',
            'service_name' => 'Tư vấn chọn sản phẩm',
            'branch_id' => $branch->id,
            'source_page' => '/lien-he',
            'message' => 'Xin tư vấn thêm.',
        ])->assertCreated();

        $this->assertDatabaseHas('consultation_requests', [
            'phone' => '0900000000',
            'service_name' => 'Tư vấn chọn sản phẩm',
            'branch_id' => $branch->id,
            'source_page' => '/lien-he',
        ]);
    }
}
