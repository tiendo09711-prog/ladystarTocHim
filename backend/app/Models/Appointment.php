<?php

namespace App\Models;

use App\Support\PhoneNormalizer;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    public const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in'];

    protected $guarded = [];

    public function setCustomerPhoneAttribute(?string $value): void
    {
        $this->attributes['customer_phone'] = PhoneNormalizer::normalize($value);
    }

    protected function casts(): array
    {
        return ['start_at' => 'datetime', 'end_at' => 'datetime', 'confirmed_at' => 'datetime', 'checked_in_at' => 'datetime', 'completed_at' => 'datetime', 'cancelled_at' => 'datetime'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function consultationRequest()
    {
        return $this->belongsTo(ConsultationRequest::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }
}
