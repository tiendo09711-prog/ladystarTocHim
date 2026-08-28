<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = AuditLog::with('actor:id,name,email')->latest('created_at');
        $query->when($request->filled('actor'), function ($builder) use ($request) {
            $value = '%'.$request->string('actor').'%';
            $builder->where(fn ($actor) => $actor->where('actor_name', 'like', $value)->orWhere('actor_email', 'like', $value));
        });
        foreach (['action', 'module', 'subject_type', 'subject_id', 'ip_address'] as $field) {
            $input = $field === 'ip_address' ? 'ip' : $field;
            $query->when($request->filled($input), fn ($builder) => $builder->where($field, $request->input($input)));
        }
        $query->when($request->filled('date_from'), fn ($builder) => $builder->whereDate('created_at', '>=', $request->date('date_from')));
        $query->when($request->filled('date_to'), fn ($builder) => $builder->whereDate('created_at', '<=', $request->date('date_to')));
        $query->when($request->filled('search'), function ($builder) use ($request) {
            $value = '%'.$request->string('search').'%';
            $builder->where(fn ($search) => $search->where('action', 'like', $value)->orWhere('module', 'like', $value)->orWhere('subject_type', 'like', $value)->orWhere('subject_id', 'like', $value));
        });

        return $this->success($query->paginate(min(max($request->integer('per_page', 25), 1), 100)));
    }

    public function show(AuditLog $auditLog)
    {
        return $this->success($auditLog->load('actor:id,name,email'));
    }
}
