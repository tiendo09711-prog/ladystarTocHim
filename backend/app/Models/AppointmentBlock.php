<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppointmentBlock extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['start_at' => 'datetime', 'end_at' => 'datetime'];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
