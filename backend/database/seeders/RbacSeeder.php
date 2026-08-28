<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\StaffRole;
use App\Support\PermissionRegistry;
use Illuminate\Database\Seeder;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        foreach (PermissionRegistry::definitions() as $definition) {
            Permission::updateOrCreate(['key' => $definition['key']], $definition);
        }

        foreach (PermissionRegistry::defaultRoles() as $slug => $definition) {
            $role = StaffRole::updateOrCreate(
                ['slug' => $slug],
                ['name' => $definition['name'], 'description' => null, 'is_system' => true],
            );
            $role->permissions()->sync(Permission::whereIn('key', $definition['permissions'])->pluck('id'));
        }
    }
}
