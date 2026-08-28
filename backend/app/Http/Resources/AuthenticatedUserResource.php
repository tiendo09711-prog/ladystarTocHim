<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthenticatedUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role,
            'status' => $this->status,
            'is_super_admin' => $this->isSuperAdmin(),
            'permissions' => $this->effectivePermissionKeys(),
            'staff_roles' => $this->isStaff()
                ? $this->staffRoles()->orderBy('name')->get(['staff_roles.id', 'name', 'slug'])->map->only(['id', 'name', 'slug'])->values()
                : [],
        ];
    }
}
