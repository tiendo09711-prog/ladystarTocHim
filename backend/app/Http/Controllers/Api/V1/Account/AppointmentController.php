<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerAppointmentResource;
use App\Models\Appointment;
use App\Services\AppointmentService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    use ApiResponse;

    public function __construct(private AppointmentService $service) {}

    public function index(Request $request)
    {
        $rows = $request->user()->appointments()->with('branch', 'service')->latest('start_at')->paginate(10);
        $rows->setCollection($rows->getCollection()->map(fn ($row) => (new CustomerAppointmentResource($row))->resolve()));

        return $this->success($rows);
    }

    public function store(Request $request)
    {
        $data = $request->validate(['branch_id' => ['required', 'exists:branches,id'], 'service_id' => ['required', 'exists:services,id'], 'start_at' => ['required', 'date'], 'customer_name' => ['required', 'string', 'max:190'], 'customer_phone' => ['required', 'string', 'min:8', 'max:30'], 'customer_email' => ['nullable', 'email', 'max:190'], 'customer_note' => ['nullable', 'string', 'max:3000']]);

        return $this->success((new CustomerAppointmentResource($this->service->create($data, $request->user()->id, 'account')))->resolve(), 'Appointment booked.', 201);
    }

    public function show(Request $request, Appointment $appointment)
    {
        $row = $request->user()->appointments()->whereKey($appointment->id)->with('branch', 'service')->firstOrFail();

        return $this->success((new CustomerAppointmentResource($row))->resolve());
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        $row = $request->user()->appointments()->whereKey($appointment->id)->firstOrFail();

        return $this->success((new CustomerAppointmentResource($this->service->cancel($row)))->resolve());
    }

    public function reschedule(Request $request, Appointment $appointment)
    {
        $row = $request->user()->appointments()->whereKey($appointment->id)->firstOrFail();
        $start = $request->validate(['start_at' => ['required', 'date']])['start_at'];

        return $this->success((new CustomerAppointmentResource($this->service->reschedule($row, $start)))->resolve());
    }
}
