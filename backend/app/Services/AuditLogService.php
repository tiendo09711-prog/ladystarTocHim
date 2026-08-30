<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class AuditLogService
{
    private const SENSITIVE = [
        'password', 'password_confirmation', 'remember_token', 'token', 'authorization',
        'cookie', 'secret', 'api_key', 'access_token', 'refresh_token',
    ];

    public function record(
        string $action,
        string $module,
        Model|string|null $subject = null,
        ?array $before = null,
        ?array $after = null,
        array $metadata = [],
        ?User $actor = null,
    ): AuditLog {
        $request = request();
        $actor ??= $request->user();
        $request->attributes->set('audit.explicit_logged', true);

        return AuditLog::create([
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name,
            'actor_email' => $actor?->email,
            'action' => $action,
            'module' => $module,
            'subject_type' => $subject instanceof Model ? class_basename($subject) : ($subject ?: null),
            'subject_id' => $subject instanceof Model ? (string) $subject->getKey() : null,
            'before_values' => $this->sanitize($before),
            'after_values' => $this->sanitize($after),
            'metadata' => $this->sanitize($metadata),
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 1000, ''),
            'request_method' => $request->method(),
            'request_path' => Str::limit($request->path(), 2000, ''),
        ]);
    }

    public function sanitize(?array $values): ?array
    {
        if ($values === null) return null;

        return collect($values)->mapWithKeys(function ($value, $key) {
            $normalized = Str::lower((string) $key);
            if (collect(self::SENSITIVE)->contains(fn (string $secret) => Str::contains($normalized, $secret))) {
                return [$key => '[REDACTED]'];
            }
            if ($value instanceof UploadedFile) {
                return [$key => ['name' => $value->getClientOriginalName(), 'mime' => $value->getClientMimeType(), 'size' => $value->getSize()]];
            }
            if (is_array($value)) return [$key => $this->sanitize($value)];
            if (is_string($value)) return [$key => Str::limit($value, 2000, '…')];
            if (is_object($value)) return [$key => Str::limit(json_encode($value) ?: class_basename($value), 2000, '…')];

            return [$key => $value];
        })->all();
    }

    public function modelSnapshot(Model $model): array
    {
        return $this->sanitize(Arr::except($model->getAttributes(), self::SENSITIVE)) ?? [];
    }
}
