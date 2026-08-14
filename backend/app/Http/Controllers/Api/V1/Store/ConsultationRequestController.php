<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConsultationRequestStoreRequest;
use App\Models\ConsultationRequest;
use App\Models\Service;
use App\Support\ApiResponse;

class ConsultationRequestController extends Controller
{
    use ApiResponse;

    public function store(ConsultationRequestStoreRequest $request)
    {
        $data = $request->validated();
        if (! empty($data['service_id'])) {
            $service = Service::active()->findOrFail($data['service_id']);
            $data['service_name'] = $service->name;
        }
        $consultation = ConsultationRequest::create($data + ['status' => 'new']);

        return $this->success(['id' => $consultation->id], 'Consultation request submitted.', 201);
    }
}
