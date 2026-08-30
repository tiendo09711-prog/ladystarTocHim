<?php

namespace App\Http\Middleware;

use App\Services\AuditLogService;
use App\Support\AdminAuditRegistry;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AuditAdminMutation
{
    public function __construct(private AuditLogService $audit) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        $subject = collect($request->route()?->parameters() ?? [])->first(fn ($value) => $value instanceof Model);
        $before = $subject instanceof Model ? $this->audit->modelSnapshot($subject) : null;
        $response = $next($request);

        if ($response->getStatusCode() >= 400 || $request->attributes->get('audit.explicit_logged')) {
            return $response;
        }

        $after = null;
        if ($subject instanceof Model && $request->method() !== 'DELETE') {
            try {
                $subject->refresh();
                $after = $this->audit->modelSnapshot($subject);
            } catch (Throwable) {
                $after = null;
            }
        }

        [$action, $module, $additionalActions] = array_pad(AdminAuditRegistry::resolve($request), 3, []);
        $this->audit->record($action, $module, $subject, $before, $after, [
            'controller_action' => $request->route()?->getActionName(),
            'route_uri' => $request->route()?->uri(),
            'route_parameters' => $request->route()?->parameters(),
            'request_fields' => $request->except([]),
            'response_status' => $response->getStatusCode(),
        ]);
        foreach ($additionalActions as [$additionalAction, $additionalModule]) {
            $this->audit->record($additionalAction, $additionalModule, $subject, $before, $after, [
                'controller_action' => $request->route()?->getActionName(),
                'route_uri' => $request->route()?->uri(),
                'route_parameters' => $request->route()?->parameters(),
                'request_fields' => $request->except([]),
                'response_status' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }
}
