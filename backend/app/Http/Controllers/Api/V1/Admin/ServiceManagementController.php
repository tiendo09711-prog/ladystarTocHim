<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class ServiceManagementController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $services = Service::query()->orderBy('sort_order')->orderBy('id')->get();

        return $this->success(ServiceResource::collection($services)->resolve());
    }

    public function store(ServiceRequest $request)
    {
        $service = Service::create($request->validated());

        return $this->success((new ServiceResource($service))->resolve(), 'Đã tạo dịch vụ.', 201);
    }

    public function show(Service $service)
    {
        return $this->success((new ServiceResource($service))->resolve());
    }

    public function update(ServiceRequest $request, Service $service)
    {
        $service->update($request->validated());

        return $this->success((new ServiceResource($service->fresh()))->resolve(), 'Đã cập nhật dịch vụ.');
    }

    public function status(Request $request, Service $service)
    {
        $data = $request->validate(['status' => ['required', Rule::in(Service::STATUSES)]]);
        $service->update($data);

        return $this->success((new ServiceResource($service->fresh()))->resolve());
    }

    public function uploadImage(Request $request, Service $service)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'image_alt' => ['nullable', 'string', 'max:190'],
        ]);
        $newPath = $data['image']->storePubliclyAs('services/'.$service->id, Str::uuid().'.'.$data['image']->extension(), 'public');
        $oldPath = $service->image_path;

        try {
            $service->update(['image_path' => $newPath] + (array_key_exists('image_alt', $data) ? ['image_alt' => $data['image_alt']] : []));
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($newPath);
            throw $exception;
        }

        $this->deleteManagedImage($oldPath);

        return $this->success((new ServiceResource($service->fresh()))->resolve(), 'Đã tải ảnh dịch vụ.', 201);
    }

    public function deleteImage(Service $service)
    {
        $oldPath = $service->image_path;
        $service->update(['image_path' => null]);
        $this->deleteManagedImage($oldPath);

        return $this->success((new ServiceResource($service->fresh()))->resolve(), 'Đã xóa ảnh dịch vụ.');
    }

    public function destroy(Service $service)
    {
        $service->delete();

        return $this->success(null, 'Đã xóa dịch vụ.');
    }

    private function deleteManagedImage(?string $path): void
    {
        if ($path && ! str_starts_with($path, '/') && ! preg_match('/^https?:\/\//', $path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
