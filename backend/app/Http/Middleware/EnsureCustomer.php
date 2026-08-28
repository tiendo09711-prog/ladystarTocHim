<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomer
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->status !== 'active' || ! $request->user()?->isCustomer()) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản này không được truy cập khu vực khách hàng.',
                'errors' => [],
            ], 403);
        }

        return $next($request);
    }
}
