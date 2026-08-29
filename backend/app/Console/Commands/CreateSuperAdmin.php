<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateSuperAdmin extends Command
{
    protected $signature = 'users:create-super-admin';

    protected $description = 'Create a Super Admin without exposing a password in shell history';

    public function handle(): int
    {
        $password = $this->secret('Password');
        $data = [
            'name' => $this->ask('Name'),
            'email' => $this->ask('Email'),
            'phone' => $this->ask('Phone (optional)'),
            'password' => $password,
            'password_confirmation' => $this->secret('Confirm Password'),
        ];

        $validator = Validator::make($data, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        User::create($validator->validated() + ['role' => 'admin', 'status' => 'active']);
        $this->info('Super Admin created successfully.');

        return self::SUCCESS;
    }
}
