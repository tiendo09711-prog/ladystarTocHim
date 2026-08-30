<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminAppointmentResource;
use App\Models\Appointment;
use App\Models\AppointmentBlock;
use App\Models\AppointmentSchedule;
use App\Models\ConsultationRequest;
use App\Models\StoreSetting;
use App\Services\AppointmentService;
use App\Support\ApiResponse;
use App\Support\PhoneNormalizer;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AppointmentManagementController extends Controller
{
    use ApiResponse;

    public function __construct(private AppointmentService $service) {}

    public function index(Request $request)
    {
        $query = Appointment::with('branch', 'service')->latest('start_at');
        $query->when($request->filled('date'), fn ($q) => $q->whereDate('start_at', $request->input('date')));
        $query->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
        $query->when($request->filled('service_id'), fn ($q) => $q->where('service_id', $request->integer('service_id')));
        $query->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')));
        $query->when($request->filled('customer'), fn ($q) => $q->where('customer_name', 'like', '%'.$request->string('customer').'%'));
        $query->when($request->filled('phone'), function ($q) use ($request) {
            $phone = PhoneNormalizer::normalizeIfPossible($request->input('phone')) ?? trim((string) $request->input('phone'));
            $q->where('customer_phone', 'like', '%'.$phone.'%');
        });
        $rows = $query->paginate(30);
        $rows->setCollection($rows->getCollection()->map(fn ($row) => (new AdminAppointmentResource($row))->resolve()));

        return $this->success($rows);
    }

    public function show(Appointment $appointment)
    {
        return $this->success((new AdminAppointmentResource($appointment->load('branch', 'service')))->resolve());
    }

    public function confirm(Request $request, Appointment $appointment)
    {
        return $this->result($this->service->transition($appointment, 'confirmed', $request->input('admin_note')));
    }

    public function checkIn(Request $request, Appointment $appointment)
    {
        return $this->result($this->service->transition($appointment, 'checked_in', $request->input('admin_note')));
    }

    public function complete(Request $request, Appointment $appointment)
    {
        return $this->result($this->service->transition($appointment, 'completed', $request->input('admin_note')));
    }

    public function noShow(Request $request, Appointment $appointment)
    {
        return $this->result($this->service->transition($appointment, 'no_show', $request->input('admin_note')));
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        return $this->result($this->service->cancel($appointment, true));
    }

    public function reschedule(Request $request, Appointment $appointment)
    {
        return $this->result($this->service->reschedule($appointment, $request->validate(['start_at' => ['required', 'date']])['start_at'], true));
    }

    public function convertConsultation(Request $request, ConsultationRequest $consultationRequest)
    {
        $data = $request->validate(['branch_id' => ['nullable', 'exists:branches,id'], 'service_id' => ['nullable', 'exists:services,id'], 'start_at' => ['required', 'date'], 'customer_email' => ['nullable', 'email', 'max:190']]);

        return $this->result($this->service->convertConsultation($consultationRequest, $data));
    }

    public function schedules(Request $request)
    {
        return $this->success(AppointmentSchedule::with('branch')->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))->orderBy('branch_id')->orderBy('day_of_week')->orderBy('start_time')->get());
    }

    public function storeSchedule(Request $request)
    {
        $data = $this->scheduleData($request);
        $this->assertNoScheduleOverlap($data);

        return $this->success(AppointmentSchedule::create($data), 'Schedule created.', 201);
    }

    public function updateSchedule(Request $request, AppointmentSchedule $schedule)
    {
        $data = $this->scheduleData($request);
        $this->assertNoScheduleOverlap($data, $schedule->id);
        DB::transaction(function () use ($schedule, $data) {
            $locked = AppointmentSchedule::lockForUpdate()->findOrFail($schedule->id);
            $this->assertScheduleChangeSafe($locked, $data);
            $locked->update($data);
        });

        return $this->success($schedule->refresh());
    }

    public function deleteSchedule(AppointmentSchedule $schedule)
    {
        DB::transaction(function () use ($schedule) {
            $locked = AppointmentSchedule::lockForUpdate()->findOrFail($schedule->id);
            $this->assertScheduleChangeSafe($locked, null);
            $locked->delete();
        });

        return $this->success(null);
    }

    public function blocks(Request $request)
    {
        return $this->success(AppointmentBlock::with('branch')->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))->latest('start_at')->get());
    }

    public function storeBlock(Request $request)
    {
        $data = $request->validate(['branch_id' => ['required', 'exists:branches,id'], 'start_at' => ['required', 'date'], 'end_at' => ['required', 'date', 'after:start_at'], 'reason' => ['nullable', 'string', 'max:2000']]);
        $data['start_at'] = CarbonImmutable::parse($data['start_at'])->utc();
        $data['end_at'] = CarbonImmutable::parse($data['end_at'])->utc();
        $data['created_by'] = $request->user()->id;

        $block = DB::transaction(function () use ($data) {
            $conflicts = Appointment::where('branch_id', $data['branch_id'])->whereIn('status', Appointment::ACTIVE_STATUSES)
                ->where('start_at', '<', $data['end_at'])->where('end_at', '>', $data['start_at'])->lockForUpdate()->pluck('id');
            if ($conflicts->isNotEmpty()) {
                throw ValidationException::withMessages(['conflicts' => 'Schedule block conflicts with existing appointments: '.$conflicts->implode(', ').'.']);
            }

            return AppointmentBlock::create($data);
        });

        return $this->success($block, 'Block created.', 201);
    }

    public function deleteBlock(AppointmentBlock $block)
    {
        $block->delete();

        return $this->success(null);
    }

    private function result(Appointment $appointment)
    {
        return $this->success((new AdminAppointmentResource($appointment))->resolve());
    }

    private function scheduleData(Request $request): array
    {
        return $request->validate(['branch_id' => ['required', 'exists:branches,id'], 'day_of_week' => ['required', 'integer', 'between:0,6'], 'start_time' => ['required', 'date_format:H:i'], 'end_time' => ['required', 'date_format:H:i', 'after:start_time'], 'slot_minutes' => ['required', 'integer', 'min:5', 'max:720'], 'capacity' => ['required', 'integer', 'min:1', 'max:100'], 'is_active' => ['required', 'boolean']]);
    }

    private function assertScheduleChangeSafe(AppointmentSchedule $schedule, ?array $replacement): void
    {
        $timezone = StoreSetting::current()->store_timezone ?: 'Asia/Ho_Chi_Minh';
        $appointments = Appointment::where('branch_id', $schedule->branch_id)
            ->whereIn('status', Appointment::ACTIVE_STATUSES)
            ->where('start_at', '>', now())
            ->lockForUpdate()
            ->get();
        $covered = $appointments->filter(function (Appointment $appointment) use ($schedule, $timezone) {
            $start = $appointment->start_at->copy()->setTimezone($timezone);
            $end = $appointment->end_at->copy()->setTimezone($timezone);

            return $start->dayOfWeek === (int) $schedule->day_of_week
                && $start->format('H:i:s') >= $schedule->start_time
                && $end->format('H:i:s') <= $schedule->end_time;
        });

        $conflicts = $covered->filter(function (Appointment $appointment) use ($replacement, $appointments, $timezone) {
            if (! $replacement || ! $replacement['is_active']) {
                return true;
            }
            $start = $appointment->start_at->copy()->setTimezone($timezone);
            $end = $appointment->end_at->copy()->setTimezone($timezone);
            $withinReplacement = $appointment->branch_id === (int) $replacement['branch_id']
                && $start->dayOfWeek === (int) $replacement['day_of_week']
                && $start->format('H:i:s') >= $replacement['start_time'].':00'
                && $end->format('H:i:s') <= $replacement['end_time'].':00';
            if (! $withinReplacement) {
                return true;
            }

            $scheduleStart = CarbonImmutable::parse($start->format('Y-m-d').' '.$replacement['start_time'], $timezone);
            if ($scheduleStart->diffInMinutes($start) % (int) $replacement['slot_minutes'] !== 0) {
                return true;
            }

            return $appointments->filter(fn (Appointment $other) => $other->start_at->lt($appointment->end_at) && $other->end_at->gt($appointment->start_at))->count() > (int) $replacement['capacity'];
        })->pluck('id');

        if ($conflicts->isNotEmpty()) {
            throw ValidationException::withMessages(['conflicts' => 'Schedule change conflicts with future appointments: '.$conflicts->implode(', ').'.']);
        }
    }

    private function assertNoScheduleOverlap(array $data, ?int $exceptId = null): void
    {
        $query = AppointmentSchedule::where('branch_id', $data['branch_id'])->where('day_of_week', $data['day_of_week'])->where('start_time', '<', $data['end_time'])->where('end_time', '>', $data['start_time']);
        if ($exceptId) {
            $query->whereKeyNot($exceptId);
        }
        if ($query->exists()) {
            throw ValidationException::withMessages(['start_time' => 'Schedule overlaps an existing interval.']);
        }
    }
}
