<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AdminAccountController extends Controller
{
    use ApiResponse;

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);
        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'Current password is incorrect.']);
        }

        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;
        DB::transaction(function () use ($user, $data, $currentSessionId) {
            $user->update(['password' => $data['new_password']]);
            $user->tokens()->delete();
            if (config('session.driver') === 'database' && Schema::hasTable('sessions')) {
                $sessions = DB::table('sessions')->where('user_id', $user->id);
                if ($currentSessionId !== null) {
                    $sessions->where('id', '!=', $currentSessionId);
                }
                $sessions->delete();
            }
        });

        return $this->success(null, 'Password changed successfully.');
    }
}
