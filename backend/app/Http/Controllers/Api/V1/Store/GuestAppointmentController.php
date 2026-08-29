<?php

namespace App\Http\Controllers\Api\V1\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerAppointmentResource;
use App\Models\Appointment;
use App\Services\AppointmentService;
use App\Services\GuestScopeTokenService;
use App\Support\ApiResponse;
use App\Support\PhoneNormalizer;
use Illuminate\Http\Request;

class GuestAppointmentController extends Controller
{
    use ApiResponse;

    public function __construct(private AppointmentService $service, private GuestScopeTokenService $tokens) {}

    public function lookup(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string'], 'phone' => ['required', 'string', 'min:8', 'max:30']]);
        $appointment = Appointment::where('code', $data['code'])->whereNull('user_id')->where('customer_phone', PhoneNormalizer::normalize($data['phone']))->with('branch', 'service')->first();
        if (! $appointment) {
            return $this->error('Appointment not found.', [], 404);
        }

        return $this->success(['appointment' => (new CustomerAppointmentResource($appointment))->resolve(), 'guest_token' => $this->tokens->issue('guest_appointment_management', $appointment->id, $appointment->customer_phone, 60)]);
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        abort_unless($appointment->user_id === null, 404);
        $this->verify($request, $appointment);

        return $this->success((new CustomerAppointmentResource($this->service->cancel($appointment)))->resolve());
    }

    public function reschedule(Request $request, Appointment $appointment)
    {
        abort_unless($appointment->user_id === null, 404);
        $this->verify($request, $appointment);
        $start = $request->validate(['start_at' => ['required', 'date']])['start_at'];

        return $this->success((new CustomerAppointmentResource($this->service->reschedule($appointment, $start)))->resolve());
    }

    private function verify(Request $request, Appointment $appointment): void
    {
        $this->tokens->verify((string) ($request->header('X-Guest-Token') ?: $request->input('token')), 'guest_appointment_management', $appointment->id, $appointment->customer_phone);
    }
}
