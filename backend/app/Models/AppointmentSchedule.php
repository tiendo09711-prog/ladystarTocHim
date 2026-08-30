<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppointmentSchedule extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['day_of_week' => 'integer', 'slot_minutes' => 'integer', 'capacity' => 'integer', 'is_active' => 'boolean'];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
