<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentBlock;
use App\Models\AppointmentSchedule;
use App\Models\Branch;
use App\Models\ConsultationRequest;
use App\Models\Service;
use App\Models\StoreSetting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AppointmentService
{
    public function options(): array
    {
        return ['branches' => Branch::where('is_active', true)->orderBy('name')->get(), 'services' => Service::active()->orderBy('sort_order')->get(), 'timezone' => $this->timezone()];
    }

    public function availability(int $branchId, int $serviceId, string $date): array
    {
        $settings = StoreSetting::current();
        if (! $settings->appointments_enabled) {
            throw ValidationException::withMessages(['appointments' => 'Appointments are disabled.']);
        }
        $branch = Branch::where('is_active', true)->findOrFail($branchId);
        $service = Service::active()->findOrFail($serviceId);
        $localDate = CarbonImmutable::createFromFormat('!Y-m-d', $date, $this->timezone());
        if (! $localDate) {
            throw ValidationException::withMessages(['date' => 'Invalid appointment date.']);
        }
        $schedules = AppointmentSchedule::where('branch_id', $branch->id)->where('day_of_week', $localDate->dayOfWeek)->where('is_active', true)->orderBy('start_time')->get();
        $slots = [];
        foreach ($schedules as $schedule) {
            $cursor = CarbonImmutable::parse($date.' '.$schedule->start_time, $this->timezone());
            $scheduleEnd = CarbonImmutable::parse($date.' '.$schedule->end_time, $this->timezone());
            while ($cursor->addMinutes((int) $service->duration_minutes)->lte($scheduleEnd)) {
                $end = $cursor->addMinutes((int) $service->duration_minutes);
                if ($cursor->utc()->isFuture() && $this->slotOpen($branch->id, $cursor->utc(), $end->utc(), (int) $schedule->capacity)) {
                    $slots[] = ['start_at' => $cursor->utc()->toIso8601String(), 'end_at' => $end->utc()->toIso8601String(), 'local_start' => $cursor->toIso8601String(), 'capacity' => (int) $schedule->capacity];
                }
                $cursor = $cursor->addMinutes((int) $schedule->slot_minutes);
            }
        }

        return ['date' => $date, 'timezone' => $this->timezone(), 'slots' => $slots];
    }

    public function create(array $data, ?int $userId = null, string $source = 'web', ?int $consultationId = null): Appointment
    {
        return DB::transaction(function () use ($data, $userId, $source, $consultationId) {
            if (! StoreSetting::current()->appointments_enabled) {
                throw ValidationException::withMessages(['appointments' => 'Appointments are disabled.']);
            }
            $branch = Branch::where('is_active', true)->findOrFail($data['branch_id']);
            $service = Service::active()->findOrFail($data['service_id']);
            [$start, $end] = $this->assertAvailable($branch, $service, $data['start_at'], null, true);

            return Appointment::create([
                'code' => $this->uniqueCode(), 'user_id' => $userId, 'consultation_request_id' => $consultationId,
                'branch_id' => $branch->id, 'service_id' => $service->id, 'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'], 'customer_email' => $data['customer_email'] ?? null,
                'start_at' => $start, 'end_at' => $end, 'status' => 'pending', 'source' => $source,
                'customer_note' => $data['customer_note'] ?? null, 'admin_note' => $data['admin_note'] ?? null,
            ])->load('branch', 'service');
        });
    }

    public function reschedule(Appointment $appointment, string $startAt, bool $adminOverride = false): Appointment
    {
        return DB::transaction(function () use ($appointment, $startAt, $adminOverride) {
            $locked = Appointment::lockForUpdate()->findOrFail($appointment->id);
            $this->assertCustomerMutable($locked, $adminOverride);
            $branch = Branch::where('is_active', true)->findOrFail($locked->branch_id);
            $service = Service::active()->findOrFail($locked->service_id);
            [$start, $end] = $this->assertAvailable($branch, $service, $startAt, $locked->id, true);
            $locked->update(['start_at' => $start, 'end_at' => $end]);

            return $locked->refresh()->load('branch', 'service');
        });
    }

    public function cancel(Appointment $appointment, bool $adminOverride = false): Appointment
    {
        return DB::transaction(function () use ($appointment, $adminOverride) {
            $locked = Appointment::lockForUpdate()->findOrFail($appointment->id);
            if ($locked->status === 'cancelled') {
                return $locked;
            }
            $this->assertCustomerMutable($locked, $adminOverride);
            $locked->update(['status' => 'cancelled', 'cancelled_at' => now()]);

            return $locked->refresh();
        });
    }

    public function transition(Appointment $appointment, string $status, ?string $adminNote = null): Appointment
    {
        return DB::transaction(function () use ($appointment, $status, $adminNote) {
            $locked = Appointment::lockForUpdate()->findOrFail($appointment->id);
            if ($locked->status === $status) {
                return $locked;
            }
            $allowed = ['pending' => ['confirmed', 'cancelled'], 'confirmed' => ['checked_in', 'cancelled', 'no_show'], 'checked_in' => ['completed'], 'completed' => [], 'cancelled' => [], 'no_show' => []];
            if (! in_array($status, $allowed[$locked->status] ?? [], true)) {
                throw ValidationException::withMessages(['status' => 'Invalid appointment lifecycle transition.']);
            }
            $updates = ['status' => $status];
            if ($status === 'confirmed') {
                $updates['confirmed_at'] = now();
            }
            if ($status === 'checked_in') {
                $updates['checked_in_at'] = now();
            }
            if ($status === 'completed') {
                $updates['completed_at'] = now();
            }
            if ($status === 'cancelled') {
                $updates['cancelled_at'] = now();
            }
            if ($adminNote !== null) {
                $updates['admin_note'] = $adminNote;
            }
            $locked->update($updates);
            if ($status === 'completed' && $locked->consultation_request_id) {
                ConsultationRequest::whereKey($locked->consultation_request_id)->update(['status' => 'completed']);
            }

            return $locked->refresh()->load('branch', 'service');
        });
    }

    public function convertConsultation(ConsultationRequest $consultation, array $data): Appointment
    {
        return DB::transaction(function () use ($consultation, $data) {
            $locked = ConsultationRequest::lockForUpdate()->findOrFail($consultation->id);
            if ($locked->appointment()->exists()) {
                throw ValidationException::withMessages(['consultation' => 'Consultation was already converted.']);
            }
            $appointment = $this->create([
                'branch_id' => $data['branch_id'] ?? $locked->branch_id, 'service_id' => $data['service_id'] ?? $locked->service_id,
                'start_at' => $data['start_at'], 'customer_name' => $locked->name, 'customer_phone' => $locked->phone,
                'customer_email' => $data['customer_email'] ?? null, 'customer_note' => $locked->message,
            ], null, 'consultation', $locked->id);
            $locked->update(['status' => 'contacted']);

            return $appointment;
        });
    }

    private function assertAvailable(Branch $branch, Service $service, string $startAt, ?int $excludeId, bool $lock): array
    {
        $start = CarbonImmutable::parse($startAt)->utc();
        $end = $start->addMinutes((int) $service->duration_minutes);
        if (! $start->isFuture()) {
            throw ValidationException::withMessages(['start_at' => 'Appointment must be in the future.']);
        }
        $local = $start->setTimezone($this->timezone());
        $query = AppointmentSchedule::where('branch_id', $branch->id)->where('day_of_week', $local->dayOfWeek)->where('is_active', true);
        if ($lock) {
            $query->lockForUpdate();
        }
        $schedules = $query->get();
        $schedule = $schedules->first(function ($schedule) use ($local, $end) {
            $date = $local->format('Y-m-d');
            $scheduleStart = CarbonImmutable::parse($date.' '.$schedule->start_time, $this->timezone());
            $scheduleEnd = CarbonImmutable::parse($date.' '.$schedule->end_time, $this->timezone());

            return $local->gte($scheduleStart) && $end->setTimezone($this->timezone())->lte($scheduleEnd) && $scheduleStart->diffInMinutes($local) % (int) $schedule->slot_minutes === 0;
        });
        if (! $schedule) {
            throw ValidationException::withMessages(['start_at' => 'Selected time is outside the appointment schedule.']);
        }
        if (! $this->slotOpen($branch->id, $start, $end, (int) $schedule->capacity, $excludeId)) {
            throw ValidationException::withMessages(['start_at' => 'Selected time is blocked or fully booked.']);
        }

        return [$start, $end];
    }

    private function slotOpen(int $branchId, CarbonImmutable $start, CarbonImmutable $end, int $capacity, ?int $excludeId = null): bool
    {
        if (AppointmentBlock::where('branch_id', $branchId)->where('start_at', '<', $end)->where('end_at', '>', $start)->exists()) {
            return false;
        }
        $query = Appointment::where('branch_id', $branchId)->whereIn('status', Appointment::ACTIVE_STATUSES)->where('start_at', '<', $end)->where('end_at', '>', $start);
        if ($excludeId) {
            $query->whereKeyNot($excludeId);
        }

        return $query->count() < $capacity;
    }

    private function assertCustomerMutable(Appointment $appointment, bool $adminOverride): void
    {
        if (! in_array($appointment->status, ['pending', 'confirmed'], true)) {
            throw ValidationException::withMessages(['status' => 'Appointment cannot be changed.']);
        }
        if (! $adminOverride && now()->gte($appointment->start_at->copy()->subHours((int) StoreSetting::current()->appointment_cancel_before_hours))) {
            throw ValidationException::withMessages(['start_at' => 'Cancellation or reschedule cutoff has passed.']);
        }
    }

    private function timezone(): string
    {
        return StoreSetting::current()->store_timezone ?: config('app.timezone');
    }

    private function uniqueCode(): string
    {
        do {
            $code = 'AP-'.now()->format('ymd').'-'.strtoupper(Str::random(6));
        } while (Appointment::where('code', $code)->exists());

        return $code;
    }
}
