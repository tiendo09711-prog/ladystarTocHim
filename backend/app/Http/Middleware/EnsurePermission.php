<?php

namespace App\Http\Middleware;

use App\Support\PermissionRegistry;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();
        $required = $permissions === ['auto'] ? PermissionRegistry::requiredFor($request) : $permissions;

        if ($required === null || ! $user || collect($required)->contains(fn (string $permission) => ! $user->hasPermission($permission))) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
                'errors' => [],
            ], 403);
        }

        return $next($request);
    }
}
