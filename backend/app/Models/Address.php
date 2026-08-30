<?php

namespace App\Models;

use App\Support\PhoneNormalizer;
use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    protected $guarded = [];

    public function setPhoneAttribute(?string $value): void
    {
        $this->attributes['phone'] = PhoneNormalizer::normalize($value);
    }

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }
}
