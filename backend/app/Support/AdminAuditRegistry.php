<?php

namespace App\Support;

use App\Models\AfterSalesShipment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class AdminAuditRegistry
{
    public static function resolve(Request $request): array
    {
        $uri = Str::after($request->route()?->uri() ?? '', 'api/v1/admin/');
        $method = strtoupper($request->method());
        $last = Str::afterLast($uri, '/');

        $mapped = match (true) {
            $uri === 'import/products' => ['inventory.product_imported', 'inventory'],
            Str::startsWith($uri, 'inventory/transfer') => ['inventory.transferred', 'inventory'],
            Str::startsWith($uri, ['inventory/adjust', 'inventory/import']) => ['inventory.adjusted', 'inventory'],
            Str::contains($uri, 'payment-status') => ['payment.status_changed', 'payments'],
            Str::contains($uri, 'confirm-cod-delivery') => ['shipment.cod_delivery_confirmed', 'shipments'],
            $uri === 'orders' && $method === 'POST' => ['order.created_by_admin', 'orders'],
            preg_match('#^orders/[^/]+$#', $uri) === 1 && $method === 'PATCH' => ['order.updated', 'orders'],
            Str::endsWith($uri, '/cancel') && Str::startsWith($uri, 'orders/') => ['order.cancelled', 'orders'],
            Str::endsWith($uri, '/status') && Str::startsWith($uri, 'orders/') => ['order.status_changed', 'orders'],
            Str::contains($uri, '/notes') => ['order.note_updated', 'orders'],
            Str::contains($uri, '/shipment/status') && Str::startsWith($uri, 'orders/') => ['shipment.status_changed', 'shipments'],
            Str::contains($uri, '/shipment') && Str::startsWith($uri, 'orders/') => ['shipment.updated', 'shipments'],
            Str::endsWith($uri, '/refund') => ['refund.created', 'refunds'],
            Str::startsWith($uri, ['returns/', 'warranties/']) && $last === 'shipment' => [
                'after_sales_shipment.'.($request->attributes->get('audit.after_sales_shipment_action') ?? 'updated'),
                'shipments',
            ],
            Str::startsWith($uri, ['returns/', 'warranties/']) && $last === 'status' => [
                self::afterSalesShipmentAction($request),
                'shipments',
                self::afterSalesShipmentAdditionalActions($request),
            ],
            Str::startsWith($uri, 'returns/') => [self::afterSalesAction('return', $last), 'returns', self::afterSalesAdditionalActions('return', $last)],
            Str::startsWith($uri, 'refunds/') => [self::afterSalesAction('refund', $last), 'refunds'],
            Str::startsWith($uri, 'warranties/') => [self::afterSalesAction('warranty', $last), 'warranties', self::afterSalesAdditionalActions('warranty', $last)],
            Str::startsWith($uri, 'appointments/') => [self::appointmentAction($last), 'appointments'],
            Str::startsWith($uri, 'appointment-schedules') => [self::crudAction('appointment_schedule', $method), 'appointments'],
            Str::startsWith($uri, 'appointment-blocks') => [self::crudAction('appointment_block', $method), 'appointments'],
            Str::contains($uri, '/appointment') && Str::startsWith($uri, 'consultation-requests') => ['consultation.converted_to_appointment', 'appointments'],
            Str::endsWith($uri, '/status') && Str::startsWith($uri, 'customers/') => ['customer.status_changed', 'customers'],
            Str::endsWith($uri, '/status') && Str::startsWith($uri, 'reviews/') => ['review.status_changed', 'reviews'],
            $method === 'DELETE' && Str::startsWith($uri, 'reviews/') => ['review.deleted', 'reviews'],
            $uri === 'settings' && $method === 'PUT' => ['settings.updated', 'settings'],
            $uri === 'settings/bank-qr' && $method === 'POST' => ['settings.bank_qr_updated', 'settings'],
            $uri === 'settings/bank-qr' && $method === 'DELETE' => ['settings.bank_qr_deleted', 'settings'],
            Str::startsWith($uri, 'products/') && Str::contains($uri, '/variants') => [self::crudAction('product_variant', $method), 'products'],
            Str::startsWith($uri, 'products') => [self::productAction($uri, $method), 'products'],
            Str::startsWith($uri, 'categories') => [self::crudAction('category', $method), 'catalog'],
            Str::startsWith($uri, 'brands') => [self::crudAction('brand', $method), 'catalog'],
            Str::startsWith($uri, 'attributes') => [self::crudAction('attribute', $method), 'catalog'],
            Str::startsWith($uri, 'branches') => [self::crudAction('branch', $method), 'branches'],
            Str::startsWith($uri, 'services') => [self::crudAction('service', $method), 'services'],
            Str::startsWith($uri, 'coupons') => [self::crudAction('coupon', $method), 'coupons'],
            default => ['admin.mutation', self::module($uri)],
        };

        return $mapped;
    }

    private static function afterSalesAction(string $prefix, string $last): string
    {
        if ($last === 'handover') {
            return ($prefix === 'return' ? 'exchange' : $prefix).'.replacement_handover';
        }

        $action = match ($last) {
            'review' => 'reviewed', 'approve' => 'approved', 'reject' => 'rejected', 'receive' => 'received',
            'complete' => 'completed', 'cancel' => 'cancelled', 'processing' => 'processing', 'ready' => 'ready',
            'shipment' => 'shipment_updated', 'status' => 'shipment_updated', 'mark-returning' => 'returning',
            default => 'updated',
        };

        return $prefix.'.'.$action;
    }

    private static function afterSalesShipmentAction(Request $request): string
    {
        $status = (string) $request->input('status');
        $shipment = $request->route('shipment');
        if ($status === 'shipped' && $shipment instanceof AfterSalesShipment && in_array($shipment->status, ['delivery_failed', 'returned'], true)) {
            return 'after_sales_shipment.retried';
        }

        return 'after_sales_shipment.'.match ($status) {
            'shipped' => 'shipped',
            'delivery_failed' => 'delivery_failed',
            'returned' => 'returned',
            'delivered' => 'delivered',
            default => 'updated',
        };
    }

    private static function afterSalesShipmentAdditionalActions(Request $request): array
    {
        if ($request->input('status') !== 'delivered') {
            return [];
        }
        $shipment = $request->route('shipment');

        return match ($shipment?->purpose) {
            'warranty_outbound' => [['warranty.completed', 'warranties']],
            'exchange_outbound' => [['exchange.completed', 'returns']],
            default => [],
        };
    }

    private static function afterSalesAdditionalActions(string $prefix, string $last): array
    {
        if ($last !== 'handover') {
            return [];
        }

        return $prefix === 'return'
            ? [['exchange.completed', 'returns']]
            : [['warranty.completed', 'warranties']];
    }

    private static function appointmentAction(string $last): string
    {
        return 'appointment.'.match ($last) {
            'confirm' => 'confirmed', 'check-in' => 'checked_in', 'complete' => 'completed',
            'no-show' => 'no_show', 'cancel' => 'cancelled', 'reschedule' => 'rescheduled', default => 'updated',
        };
    }

    private static function productAction(string $uri, string $method): string
    {
        if (Str::endsWith($uri, '/status')) {
            return 'product.status_changed';
        }

        return self::crudAction('product', $method);
    }

    private static function crudAction(string $prefix, string $method): string
    {
        return $prefix.'.'.match ($method) {
            'POST' => 'created', 'DELETE' => 'deleted', default => 'updated',
        };
    }

    private static function module(string $uri): string
    {
        return Str::of(Str::before($uri, '/'))->replace('-', '_')->value() ?: 'admin';
    }
}
