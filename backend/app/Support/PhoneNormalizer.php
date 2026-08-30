<?php

namespace App\Support;

final class PhoneNormalizer
{
    public static function normalize(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', trim($phone)) ?? '';
        if (str_starts_with($digits, '0084')) {
            $digits = substr($digits, 2);
        }
        if (str_starts_with($digits, '84')) {
            $digits = '0'.substr($digits, 2);
        }

        return $digits === '' ? null : $digits;
    }

    public static function normalizeIfPossible(?string $phone): ?string
    {
        if ($phone === null || preg_match('/[\pL@]/u', $phone)) {
            return null;
        }

        $normalized = self::normalize($phone);

        return $normalized !== null && preg_match('/^0\d{8,10}$/', $normalized) ? $normalized : null;
    }
}
