<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerAppointmentResource;
use App\Services\AppointmentService;
use App\Services\GuestScopeTokenService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    use ApiResponse;

    public function __construct(private AppointmentService $service, private GuestScopeTokenService $tokens) {}

    public function options()
    {
        return $this->success($this->service->options());
    }

    public function availability(Request $request)
    {
        $data = $request->validate(['branch_id' => ['required', 'integer', 'exists:branches,id'], 'service_id' => ['required', 'integer', 'exists:services,id'], 'date' => ['required', 'date_format:Y-m-d']]);

        return $this->success($this->service->availability($data['branch_id'], $data['service_id'], $data['date']));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $appointment = $this->service->create($data, null, 'web');

        return $this->success(['appointment' => (new CustomerAppointmentResource($appointment))->resolve(), 'guest_token' => $this->tokens->issue('guest_appointment_management', $appointment->id, $appointment->customer_phone, 60)], 'Appointment booked.', 201);
    }

    private function validated(Request $request): array
    {
        return $request->validate(['branch_id' => ['required', 'exists:branches,id'], 'service_id' => ['required', 'exists:services,id'], 'start_at' => ['required', 'date'], 'customer_name' => ['required', 'string', 'max:190'], 'customer_phone' => ['required', 'string', 'min:8', 'max:30'], 'customer_email' => ['nullable', 'email', 'max:190'], 'customer_note' => ['nullable', 'string', 'max:3000']]);
    }
}
