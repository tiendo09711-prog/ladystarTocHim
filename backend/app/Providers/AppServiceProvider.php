<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth-login', fn (Request $request) => Limit::perMinute((int) config('features.auth_login_attempts', 5))->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));
        RateLimiter::for('admin-login', fn (Request $request) => Limit::perMinute((int) config('features.admin_login_attempts', 5))->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));
        RateLimiter::for('auth-register', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('auth-forgot-password', fn (Request $request) => Limit::perMinute(3)->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));
        RateLimiter::for('auth-reset-password', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
    }
}
