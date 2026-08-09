<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactPageContent extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['settings_json' => 'array'];
    }
}
