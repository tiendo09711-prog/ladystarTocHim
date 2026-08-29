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
}
