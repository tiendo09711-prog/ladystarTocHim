<?php

use App\Http\Middleware\EnsureAdmin;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->alias([
            'admin' => EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $exception, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Dữ liệu không hợp lệ.', 'errors' => $exception->errors()], 422);
            }
        });
        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn cần đăng nhập để tiếp tục.', 'errors' => []], 401);
            }
        });
        $exceptions->render(function (AuthorizationException $exception, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không có quyền thực hiện thao tác này.', 'errors' => []], 403);
            }
        });
        $exceptions->render(function (ModelNotFoundException $exception, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Không tìm thấy dữ liệu yêu cầu.', 'errors' => []], 404);
            }
        });
    })->create();
