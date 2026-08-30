<?php

namespace App\Http\Resources;

use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerAppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'customer_name' => $this->customer_name, 'customer_phone' => $this->customer_phone,
            'customer_email' => $this->customer_email, 'start_at' => $this->start_at, 'end_at' => $this->end_at, 'status' => $this->status,
            'source' => $this->source, 'customer_note' => $this->customer_note, 'confirmed_at' => $this->confirmed_at,
            'checked_in_at' => $this->checked_in_at, 'completed_at' => $this->completed_at, 'cancelled_at' => $this->cancelled_at,
            'timezone' => StoreSetting::current()->store_timezone, 'branch' => $this->branch?->only(['id', 'name', 'code']),
            'service' => $this->service ? ['id' => $this->service->id, 'name' => $this->service->name, 'duration_minutes' => $this->service->duration_minutes] : null,
        ];
    }
}
