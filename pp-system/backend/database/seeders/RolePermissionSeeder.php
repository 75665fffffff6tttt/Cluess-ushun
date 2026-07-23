<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $modules = ['users', 'pesticides', 'pests', 'diseases', 'weeds', 'lab', 'monitoring', 'reports'];
        $actions = ['view', 'create', 'update', 'delete', 'export'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "$module.$action", 'guard_name' => 'web']);
            }
        }

        $all = Permission::pluck('name')->all();
        $viewOnly = array_values(array_filter($all, fn ($p) => str_ends_with($p, '.view')));

        $roles = [
            'super_admin' => $all,
            'admin'       => array_values(array_filter($all, fn ($p) => ! str_starts_with($p, 'users.delete'))),
            'laboratory'  => array_merge($viewOnly, ['lab.create', 'lab.update', 'lab.delete', 'lab.export', 'reports.create', 'reports.export']),
            'inspector'   => array_merge($viewOnly, ['monitoring.create', 'monitoring.update', 'monitoring.delete', 'monitoring.export', 'reports.create', 'reports.export']),
            'researcher'  => array_merge($viewOnly, ['pesticides.create', 'pesticides.update', 'pests.create', 'pests.update', 'diseases.create', 'diseases.update', 'weeds.create', 'weeds.update', 'reports.create', 'reports.export']),
            'farmer'      => ['pesticides.view', 'pests.view', 'diseases.view', 'weeds.view'],
        ];

        foreach ($roles as $roleName => $perms) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $role->syncPermissions(array_unique($perms));
        }
    }
}
