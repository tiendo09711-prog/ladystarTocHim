<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductVideoTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_upload_replace_and_delete_product_video(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $product = Product::firstOrFail();
        $oldPath = 'products/'.$product->id.'/video/old.mp4';
        Storage::disk('public')->put($oldPath, 'old');
        $product->update(['video_path' => $oldPath]);

        $response = $this->actingAs($admin)->post('/api/v1/admin/products/'.$product->id.'/video', [
            'video' => UploadedFile::fake()->create('product.mp4', 1024, 'video/mp4'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $path = $product->refresh()->video_path;
        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
        Storage::disk('public')->assertMissing($oldPath);
        $this->assertStringContainsString('/storage/'.$path, $response->json('data.video_path'));

        $this->actingAs($admin)->deleteJson('/api/v1/admin/products/'.$product->id.'/video')->assertOk()->assertJsonPath('data.video_path', null);
        $this->assertNull($product->refresh()->video_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_product_video_upload_requires_admin_and_valid_file(): void
    {
        Storage::fake('public');
        $this->seed();
        $admin = User::where('role', 'admin')->firstOrFail();
        $user = User::where('role', 'user')->firstOrFail();
        $product = Product::firstOrFail();

        $this->actingAs($user)->post('/api/v1/admin/products/'.$product->id.'/video', [
            'video' => UploadedFile::fake()->create('product.mp4', 100, 'video/mp4'),
        ], ['Accept' => 'application/json'])->assertForbidden();
        $this->actingAs($admin)->post('/api/v1/admin/products/'.$product->id.'/video', [
            'video' => UploadedFile::fake()->create('product.avi', 100, 'video/x-msvideo'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('video');
        $this->actingAs($admin)->post('/api/v1/admin/products/'.$product->id.'/video', [
            'video' => UploadedFile::fake()->create('product.mp4', 51201, 'video/mp4'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('video');
    }
}
