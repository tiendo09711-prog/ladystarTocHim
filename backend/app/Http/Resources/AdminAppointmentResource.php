<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class AdminAppointmentResource extends CustomerAppointmentResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + ['admin_note' => $this->admin_note, 'consultation_request_id' => $this->consultation_request_id, 'user_id' => $this->user_id];
    }
}
