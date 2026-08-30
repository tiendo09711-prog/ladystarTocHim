<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->status !== 'active' || ! $request->user()?->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ Super Admin được thực hiện thao tác này.',
                'errors' => [],
            ], 403);
        }

        return $next($request);
    }
}
