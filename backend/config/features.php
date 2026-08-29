<?php

return [
    'password_reset_email' => env('PASSWORD_RESET_EMAIL_ENABLED', false),
    'auth_login_attempts' => (int) env('AUTH_LOGIN_MAX_ATTEMPTS', 5),
    'admin_login_attempts' => (int) env('ADMIN_LOGIN_MAX_ATTEMPTS', 5),
];
