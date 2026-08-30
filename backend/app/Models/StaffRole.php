<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'slug', 'description', 'is_system'])]
class StaffRole extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return ['is_system' => 'boolean'];
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'staff_role_user')->withTimestamps();
    }

    public function permissions()
    {
        return $this->belongsToMany(Permission::class, 'permission_staff_role')->withTimestamps();
    }
}
