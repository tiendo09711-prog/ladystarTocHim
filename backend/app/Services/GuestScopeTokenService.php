<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class GuestScopeTokenService
{
    public function issue(string $scope, int $resourceId, string $phone, int $ttlMinutes = 30): string
    {
        $payload = ['scope' => $scope, 'resource_id' => $resourceId, 'phone_hash' => $this->phoneHash($phone), 'exp' => now()->addMinutes($ttlMinutes)->timestamp];
        $encoded = $this->encode(json_encode($payload, JSON_THROW_ON_ERROR));

        return $encoded.'.'.$this->encode(hash_hmac('sha256', $encoded, (string) config('app.key'), true));
    }

    public function verify(string $token, string $scope, int $resourceId, string $phone): void
    {
        [$encoded, $signature] = array_pad(explode('.', $token, 2), 2, null);
        $expected = $encoded ? $this->encode(hash_hmac('sha256', $encoded, (string) config('app.key'), true)) : '';
        $payload = $encoded ? json_decode($this->decode($encoded), true) : null;
        if (! $encoded || ! $signature || ! hash_equals($expected, $signature) || ! is_array($payload)
            || ($payload['scope'] ?? null) !== $scope || (int) ($payload['resource_id'] ?? 0) !== $resourceId
            || ! hash_equals((string) ($payload['phone_hash'] ?? ''), $this->phoneHash($phone)) || (int) ($payload['exp'] ?? 0) < now()->timestamp) {
            throw ValidationException::withMessages(['token' => 'PhiÃªn xÃ¡c minh khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.']);
        }
    }

    private function phoneHash(string $phone): string
    {
        return hash('sha256', preg_replace('/\D+/', '', $phone) ?? '');
    }

    private function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function decode(string $value): string
    {
        return (string) base64_decode(strtr($value, '-_', '+/'), true);
    }
}
