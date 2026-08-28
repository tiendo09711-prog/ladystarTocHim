<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'label', 'group_name', 'description'])]
class Permission extends Model
{
    use HasFactory;

    public function staffRoles()
    {
        return $this->belongsToMany(StaffRole::class, 'permission_staff_role')->withTimestamps();
    }
}
