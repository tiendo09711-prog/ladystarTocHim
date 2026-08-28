<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AfterSalesMedium extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    public function mediable()
    {
        return $this->morphTo();
    }
}
