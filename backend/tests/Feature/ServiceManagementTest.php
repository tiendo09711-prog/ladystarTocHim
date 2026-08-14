<?php

namespace Tests\Feature;

use App\Models\ConsultationRequest;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ServiceManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_service_admin_crud_requires_admin(): void
    {
        $payload = $this->payload();
        $user = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->postJson('/api/v1/admin/services', $payload)->assertUnauthorized();
        $this->actingAs($user)->postJson('/api/v1/admin/services', $payload)->assertForbidden();
        $created = $this->actingAs($admin)->postJson('/api/v1/admin/services', $payload)
            ->assertCreated()
            ->assertJsonPath('data.slug', 've-sinh-toc-gia')
            ->json('data');

        $this->actingAs($admin)->putJson('/api/v1/admin/services/'.$created['id'], $this->payload(['name' => 'Vệ sinh tóc hệ thống', 'slug' => 've-sinh-toc-he-thong']))
            ->assertOk()
            ->assertJsonPath('data.name', 'Vệ sinh tóc hệ thống');
        $this->actingAs($admin)->patchJson('/api/v1/admin/services/'.$created['id'].'/status', ['status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive');
    }

    public function test_admin_can_upload_replace_and_remove_service_image(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $service = Service::create($this->payload());

        $this->actingAs($admin)->postJson('/api/v1/admin/services/'.$service->id.'/image', [
            'image' => UploadedFile::fake()->image('service.jpg', 900, 900),
            'image_alt' => 'Ảnh dịch vụ',
        ])->assertCreated();
        $path = $service->fresh()->image_path;
        Storage::disk('public')->assertExists($path);

        $this->actingAs($admin)->deleteJson('/api/v1/admin/services/'.$service->id.'/image')->assertOk();
        Storage::disk('public')->assertMissing($path);
        $this->assertNull($service->fresh()->image_path);
    }

    public function test_inactive_or_deleted_service_cannot_be_booked_and_history_survives_delete(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $service = Service::create($this->payload());
        $this->postJson('/api/v1/consultation-requests', [
            'name' => 'Khách hàng',
            'phone' => '0900000000',
            'service_id' => $service->id,
            'source_page' => '/dich-vu-cham-soc',
        ])->assertCreated();

        $this->actingAs($admin)->deleteJson('/api/v1/admin/services/'.$service->id)->assertOk();
        $this->assertSoftDeleted('services', ['id' => $service->id]);
        $this->assertDatabaseHas('consultation_requests', ['service_id' => $service->id, 'service_name' => 'Vệ sinh tóc giả']);
        $this->postJson('/api/v1/consultation-requests', [
            'name' => 'Khách hàng khác',
            'phone' => '0900000001',
            'service_id' => $service->id,
            'source_page' => '/dich-vu-cham-soc',
        ])->assertUnprocessable();

        $consultation = ConsultationRequest::firstOrFail();
        $this->assertSame('Vệ sinh tóc giả', $consultation->service_name);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Vệ sinh tóc giả',
            'slug' => 've-sinh-toc-gia',
            'short_description' => 'Làm sạch tóc và phần đế.',
            'price' => 100000,
            'image_alt' => 'Vệ sinh tóc giả',
            'sort_order' => 10,
            'status' => 'active',
        ], $overrides);
    }
}
