<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConsultationRequestStoreRequest;
use App\Models\ConsultationRequest;
use App\Support\ApiResponse;

class ConsultationRequestController extends Controller
{
    use ApiResponse;

    public function store(ConsultationRequestStoreRequest $request)
    {
        $consultation = ConsultationRequest::create($request->validated() + ['status' => 'new']);

        return $this->success(['id' => $consultation->id], 'Consultation request submitted.', 201);
    }
}
