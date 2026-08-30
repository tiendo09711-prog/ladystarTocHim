<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerTag extends Model
{
    protected $guarded = [];

    public function customers()
    {
        return $this->belongsToMany(User::class, 'customer_tag_user')->withTimestamps();
    }
}
