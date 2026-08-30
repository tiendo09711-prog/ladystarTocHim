<?php

namespace Tests\Feature;

use App\Models\AppointmentBlock;
use App\Models\AppointmentSchedule;
use App\Models\Branch;
use App\Models\ConsultationRequest;
use App\Models\Service;
use App\Models\StoreSetting;
use App\Models\User;
use App\Services\AppointmentService;
use App\Services\GuestScopeTokenService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PhaseThreeAppointmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Carbon::setTestNow('2026-08-28 00:00:00');
        StoreSetting::current()->update(['store_timezone' => 'Asia/Ho_Chi_Minh', 'appointments_enabled' => true, 'appointment_cancel_before_hours' => 4]);
        Service::create(['name' => 'Appointment service', 'slug' => 'appointment-service', 'price' => 100000, 'duration_minutes' => 60, 'sort_order' => 1, 'status' => 'active']);
        $this->service()->update(['duration_minutes' => 60, 'status' => 'active']);
        AppointmentSchedule::query()->delete();
        AppointmentSchedule::create(['branch_id' => $this->branch()->id, 'day_of_week' => 6, 'start_time' => '09:00', 'end_time' => '12:00', 'slot_minutes' => 30, 'capacity' => 1, 'is_active' => true]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_disabled_inactive_and_schedule_rules_are_enforced(): void
    {
        StoreSetting::current()->update(['appointments_enabled' => false]);
        $this->expectValidation(fn () => app(AppointmentService::class)->create($this->payload('2026-08-29T09:00:00+07:00')));
        StoreSetting::current()->update(['appointments_enabled' => true]);
        $this->branch()->update(['is_active' => false]);
        $this->expectNotFound(fn () => app(AppointmentService::class)->create($this->payload('2026-08-29T09:00:00+07:00')));
        $this->branch()->update(['is_active' => true]);
        $this->service()->update(['status' => 'inactive']);
        $this->expectNotFound(fn () => app(AppointmentService::class)->create($this->payload('2026-08-29T09:00:00+07:00')));
        $this->service()->update(['status' => 'active']);
        $this->expectValidation(fn () => app(AppointmentService::class)->create($this->payload('2026-08-29T08:30:00+07:00')));
        $this->expectValidation(fn () => app(AppointmentService::class)->create($this->payload('2026-08-29T09:15:00+07:00')));
    }

    public function test_duration_timezone_block_overlap_and_capacity_are_enforced(): void
    {
        $service = app(AppointmentService::class);
        $appointment = $service->create($this->payload('2026-08-29T09:00:00+07:00'));
        $this->assertSame('2026-08-29 02:00:00', $appointment->start_at->format('Y-m-d H:i:s'));
        $this->assertEquals(60, $appointment->start_at->diffInMinutes($appointment->end_at));
        $this->expectValidation(fn () => $service->create($this->payload('2026-08-29T09:30:00+07:00')));

        AppointmentSchedule::query()->update(['capacity' => 2]);
        $service->create($this->payload('2026-08-29T09:30:00+07:00'));
        $this->expectValidation(fn () => $service->create($this->payload('2026-08-29T09:30:00+07:00')));
        AppointmentBlock::create(['branch_id' => $this->branch()->id, 'start_at' => '2026-08-29 04:00:00', 'end_at' => '2026-08-29 05:00:00']);
        $this->expectValidation(fn () => $service->create($this->payload('2026-08-29T11:00:00+07:00')));

        $availability = $service->availability($this->branch()->id, $this->service()->id, '2026-08-29');
        $this->assertSame('Asia/Ho_Chi_Minh', $availability['timezone']);
        $this->assertNotEmpty($availability['slots']);
    }

    public function test_customer_and_guest_ownership_tokens_and_reschedule_are_enforced(): void
    {
        AppointmentSchedule::query()->update(['capacity' => 2]);
        $user = User::where('role', 'user')->firstOrFail();
        $other = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $appointment = app(AppointmentService::class)->create($this->payload('2026-08-29T09:00:00+07:00'), $user->id, 'account');
        $this->actingAs($user)->getJson('/api/v1/account/appointments')->assertOk();
        $this->actingAs($other)->getJson('/api/v1/account/appointments/'.$appointment->id)->assertNotFound();
        $this->actingAs($user)->patchJson('/api/v1/account/appointments/'.$appointment->id.'/reschedule', ['start_at' => '2026-08-29T10:30:00+07:00'])->assertOk();

        $guestA = app(AppointmentService::class)->create($this->payload('2026-08-29T09:00:00+07:00'));
        $guestB = app(AppointmentService::class)->create($this->payload('2026-08-29T09:30:00+07:00'));
        $token = app(GuestScopeTokenService::class)->issue('guest_appointment_management', $guestA->id, $guestA->customer_phone);
        $this->withHeader('X-Guest-Token', 'invalid')->postJson('/api/v1/guest/appointments/'.$guestA->id.'/cancel')->assertUnprocessable();
        $this->withHeader('X-Guest-Token', $token)->postJson('/api/v1/guest/appointments/'.$guestB->id.'/cancel')->assertUnprocessable();
        $this->withHeader('X-Guest-Token', $token)->postJson('/api/v1/guest/appointments/'.$guestA->id.'/cancel')->assertOk();
    }

    public function test_cutoff_admin_override_and_completed_reschedule_rules(): void
    {
        $service = app(AppointmentService::class);
        $appointment = $service->create($this->payload('2026-08-29T09:00:00+07:00'));
        Carbon::setTestNow('2026-08-28 20:00:00');
        $service->cancel($appointment);
        $late = $service->create($this->payload('2026-08-29T10:30:00+07:00'));
        Carbon::setTestNow('2026-08-29 00:00:00');
        $this->expectValidation(fn () => $service->cancel($late));
        $service->cancel($late, true);

        Carbon::setTestNow('2026-08-28 00:00:00');
        $done = $service->create($this->payload('2026-08-29T11:00:00+07:00'));
        $service->transition($done, 'confirmed');
        $service->transition($done, 'checked_in');
        $service->transition($done, 'completed');
        $this->expectValidation(fn () => $service->reschedule($done, '2026-08-29T09:00:00+07:00', true));
    }

    public function test_status_transitions_and_consultation_conversion_are_centralized(): void
    {
        $service = app(AppointmentService::class);
        $appointment = $service->create($this->payload('2026-08-29T09:00:00+07:00'));
        $this->expectValidation(fn () => $service->transition($appointment, 'completed'));
        $service->transition($appointment, 'confirmed');
        $service->transition($appointment, 'checked_in');
        $service->transition($appointment, 'completed');
        $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'completed']);

        AppointmentSchedule::query()->update(['capacity' => 2]);
        $consultation = ConsultationRequest::create(['name' => 'Consultation User', 'phone' => '0904000000', 'service_id' => $this->service()->id, 'branch_id' => $this->branch()->id, 'source_page' => '/contact', 'status' => 'new']);
        $converted = $service->convertConsultation($consultation, ['start_at' => '2026-08-29T10:30:00+07:00']);
        $this->assertSame($consultation->id, $converted->consultation_request_id);
        $this->expectValidation(fn () => $service->convertConsultation($consultation, ['start_at' => '2026-08-29T11:00:00+07:00']));
    }

    private function branch(): Branch
    {
        return Branch::where('is_default', true)->firstOrFail();
    }

    private function service(): Service
    {
        return Service::firstOrFail();
    }

    private function payload(string $start): array
    {
        return ['branch_id' => $this->branch()->id, 'service_id' => $this->service()->id, 'start_at' => $start, 'customer_name' => 'Appointment User', 'customer_phone' => '0905000000', 'customer_email' => 'appointment@example.com'];
    }

    private function expectValidation(callable $callback): void
    {
        try {
            $callback();
            $this->fail('Expected validation exception.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }
    }

    private function expectNotFound(callable $callback): void
    {
        try {
            $callback();
            $this->fail('Expected model not found.');
        } catch (ModelNotFoundException) {
            $this->assertTrue(true);
        }
    }
}
