<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ConsultationRequest;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConsultationManagementController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        return $this->success(ConsultationRequest::with(['product:id,name,slug', 'category:id,name,slug', 'service:id,name,slug', 'branch:id,name'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->latest()->paginate(min($request->integer('per_page', 20), 100)));
    }

    public function updateStatus(Request $request, ConsultationRequest $consultationRequest)
    {
        $data = $request->validate(['status' => ['required', Rule::in(['new', 'contacted', 'completed', 'cancelled'])], 'admin_note' => ['nullable', 'string', 'max:2000']]);
        $consultationRequest->update($data);
        return $this->success($consultationRequest->fresh());
    }
}
