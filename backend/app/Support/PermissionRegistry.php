<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class PermissionRegistry
{
    public static function definitions(): array
    {
        $groups = [
            'Dashboard' => ['dashboard.view' => 'Xem dashboard'],
            'Đơn hàng' => [
                'orders.view' => 'Xem đơn hàng',
                'orders.status.manage' => 'Quản lý trạng thái đơn hàng',
                'orders.payment.manage' => 'Quản lý thanh toán',
                'orders.shipment.manage' => 'Quản lý vận chuyển',
                'orders.notes.manage' => 'Quản lý ghi chú đơn hàng',
            ],
            'Đổi trả' => ['returns.view' => 'Xem yêu cầu đổi trả', 'returns.manage' => 'Quản lý vòng đời đổi trả'],
            'Hoàn tiền' => ['refunds.view' => 'Xem hoàn tiền', 'refunds.manage' => 'Quản lý hoàn tiền'],
            'Bảo hành' => ['warranties.view' => 'Xem bảo hành', 'warranties.manage' => 'Quản lý bảo hành'],
            'Lịch hẹn' => [
                'appointments.view' => 'Xem lịch hẹn',
                'appointments.manage' => 'Quản lý lịch hẹn',
                'appointments.schedule.manage' => 'Quản lý lịch làm việc và ngày chặn',
            ],
            'Khách hàng' => ['customers.view' => 'Xem khách hàng', 'customers.status.manage' => 'Khóa hoặc mở khách hàng'],
            'Tư vấn' => ['consultations.view' => 'Xem yêu cầu tư vấn', 'consultations.manage' => 'Quản lý yêu cầu tư vấn'],
            'Đánh giá' => ['reviews.view' => 'Xem đánh giá', 'reviews.manage' => 'Kiểm duyệt đánh giá'],
            'Sản phẩm' => ['products.view' => 'Xem sản phẩm', 'products.manage' => 'Quản lý sản phẩm'],
            'Danh mục' => ['catalog.view' => 'Xem danh mục, thương hiệu và thuộc tính', 'catalog.manage' => 'Quản lý danh mục, thương hiệu và thuộc tính'],
            'Chi nhánh' => ['branches.view' => 'Xem chi nhánh', 'branches.manage' => 'Quản lý chi nhánh'],
            'Kho' => [
                'inventory.view' => 'Xem tồn kho',
                'inventory.adjust' => 'Điều chỉnh tồn kho',
                'inventory.transfer' => 'Chuyển tồn kho',
            ],
            'Barcode' => ['barcodes.view' => 'Xem barcode', 'barcodes.manage' => 'Tạo barcode'],
            'Import' => ['import.products' => 'Import sản phẩm'],
            'Export' => [
                'export.products' => 'Export sản phẩm',
                'export.orders' => 'Export đơn hàng',
                'export.inventory' => 'Export tồn kho',
                'export.customers' => 'Export khách hàng',
            ],
            'Khuyến mãi' => [
                'coupons.view' => 'Xem mã giảm giá',
                'coupons.manage' => 'Quản lý mã giảm giá',
                'promotions.view' => 'Xem ưu đãi',
                'promotions.manage' => 'Quản lý ưu đãi',
            ],
            'Dịch vụ' => ['services.view' => 'Xem dịch vụ', 'services.manage' => 'Quản lý dịch vụ'],
            'Nội dung' => [
                'content.home.manage' => 'Quản lý trang chủ',
                'content.store.manage' => 'Quản lý trang cửa hàng',
                'content.contact.manage' => 'Quản lý trang liên hệ',
                'content.about.manage' => 'Quản lý trang giới thiệu',
                'content.catalog.manage' => 'Quản lý nội dung catalog',
                'content.news.manage' => 'Quản lý tin tức',
                'content.guides.manage' => 'Quản lý hướng dẫn',
            ],
            'Hệ thống' => [
                'settings.view' => 'Xem cài đặt',
                'settings.manage' => 'Quản lý cài đặt',
                'audit.view' => 'Xem nhật ký hoạt động',
            ],
        ];

        $definitions = [];
        foreach ($groups as $group => $permissions) {
            foreach ($permissions as $key => $label) {
                $definitions[$key] = [
                    'key' => $key,
                    'label' => $label,
                    'group_name' => $group,
                    'description' => null,
                ];
            }
        }

        return $definitions;
    }

    public static function keys(): array
    {
        return array_keys(self::definitions());
    }

    public static function defaultRoles(): array
    {
        return [
            'sales' => [
                'name' => 'Nhân viên bán hàng',
                'permissions' => [
                    'dashboard.view', 'orders.view', 'orders.status.manage', 'orders.payment.manage',
                    'orders.shipment.manage', 'orders.notes.manage', 'customers.view', 'consultations.view',
                    'consultations.manage', 'appointments.view', 'appointments.manage', 'returns.view', 'warranties.view',
                ],
            ],
            'warehouse' => [
                'name' => 'Nhân viên kho',
                'permissions' => [
                    'orders.view', 'orders.shipment.manage', 'inventory.view', 'inventory.adjust',
                    'inventory.transfer', 'barcodes.view', 'barcodes.manage', 'returns.view',
                    'returns.manage', 'warranties.view', 'warranties.manage',
                ],
            ],
            'customer-service' => [
                'name' => 'Chăm sóc khách hàng',
                'permissions' => [
                    'orders.view', 'orders.notes.manage', 'customers.view', 'consultations.view',
                    'consultations.manage', 'reviews.view', 'reviews.manage', 'returns.view',
                    'returns.manage', 'refunds.view', 'warranties.view', 'warranties.manage',
                    'appointments.view', 'appointments.manage',
                ],
            ],
            'marketing' => [
                'name' => 'Marketing',
                'permissions' => ['dashboard.view', 'coupons.view', 'coupons.manage', 'promotions.view', 'promotions.manage', 'reviews.view'],
            ],
            'content' => [
                'name' => 'Content',
                'permissions' => [
                    'services.view', 'services.manage', 'content.home.manage', 'content.store.manage',
                    'content.contact.manage', 'content.about.manage', 'content.catalog.manage',
                    'content.news.manage', 'content.guides.manage',
                ],
            ],
            'manager' => ['name' => 'Quản lý', 'permissions' => self::keys()],
        ];
    }

    public static function requiredFor(Request $request): ?array
    {
        $route = $request->route();
        $uri = Str::after($route?->uri() ?? '', 'api/v1/admin/');
        $method = strtoupper($request->method());
        $read = in_array($method, ['GET', 'HEAD'], true);

        if ($uri === 'auth/me' || $uri === 'auth/logout') return [];
        if (Str::startsWith($uri, ['staff', 'staff-roles', 'permissions'])) return [];
        if (Str::startsWith($uri, 'audit-logs')) return ['audit.view'];
        if (Str::startsWith($uri, 'dashboard/')) return ['dashboard.view'];
        if ($uri === 'import/products') return ['import.products', 'products.manage', 'inventory.adjust'];
        if (Str::startsWith($uri, 'export/')) {
            $permission = match ((string) $route?->parameter('resource')) {
                'products' => 'export.products',
                'orders' => 'export.orders',
                'inventory' => 'export.inventory',
                'customers' => 'export.customers',
                default => null,
            };

            return $permission ? [$permission] : [];
        }
        if (Str::startsWith($uri, 'products')) return [$read ? 'products.view' : 'products.manage'];
        if (Str::startsWith($uri, ['categories', 'brands', 'attributes'])) return [$read ? 'catalog.view' : 'catalog.manage'];
        if (Str::startsWith($uri, 'branches')) return [$read ? 'branches.view' : 'branches.manage'];
        if (Str::startsWith($uri, 'inventory')) {
            if ($read) return ['inventory.view'];
            return [Str::startsWith($uri, 'inventory/transfer') ? 'inventory.transfer' : 'inventory.adjust'];
        }
        if (Str::startsWith($uri, 'orders')) {
            if ($read) return ['orders.view'];
            if (Str::contains($uri, 'payment-status')) return ['orders.payment.manage'];
            if (Str::contains($uri, 'notes')) return ['orders.notes.manage'];
            if (Str::contains($uri, 'shipment')) return ['orders.shipment.manage'];
            return ['orders.status.manage'];
        }
        if (Str::startsWith($uri, 'returns')) {
            if (Str::contains($uri, 'refund-summary')) return ['refunds.view'];
            if (Str::endsWith($uri, '/refund')) return ['refunds.manage'];
            return [$read ? 'returns.view' : 'returns.manage'];
        }
        if (Str::startsWith($uri, 'refunds')) return [$read ? 'refunds.view' : 'refunds.manage'];
        if (Str::startsWith($uri, 'warranties')) return [$read ? 'warranties.view' : 'warranties.manage'];
        if (Str::startsWith($uri, ['appointment-schedules', 'appointment-blocks'])) return [$read ? 'appointments.view' : 'appointments.schedule.manage'];
        if (Str::startsWith($uri, 'appointments')) return [$read ? 'appointments.view' : 'appointments.manage'];
        if (Str::startsWith($uri, 'consultation-requests')) {
            if (Str::contains($uri, '/appointment')) return ['consultations.manage', 'appointments.manage'];
            return [$read ? 'consultations.view' : 'consultations.manage'];
        }
        if (Str::startsWith($uri, 'customers')) return [$read ? 'customers.view' : 'customers.status.manage'];
        if (Str::startsWith($uri, 'reviews')) return [$read ? 'reviews.view' : 'reviews.manage'];
        if (Str::startsWith($uri, 'coupons')) return [$read ? 'coupons.view' : 'coupons.manage'];
        if (Str::startsWith($uri, 'services')) return [$read ? 'services.view' : 'services.manage'];
        if (Str::startsWith($uri, ['promotions', 'promotions-page'])) return [$read ? 'promotions.view' : 'promotions.manage'];
        if (Str::startsWith($uri, 'barcodes')) return [$read ? 'barcodes.view' : 'barcodes.manage'];
        if (Str::startsWith($uri, 'settings')) return [$read ? 'settings.view' : 'settings.manage'];
        if (Str::startsWith($uri, 'home-page')) return ['content.home.manage'];
        if (Str::startsWith($uri, 'store-page')) return ['content.store.manage'];
        if (Str::startsWith($uri, 'contact-page')) return ['content.contact.manage'];
        if (Str::startsWith($uri, 'about')) return ['content.about.manage'];
        if (Str::startsWith($uri, 'catalog/content')) return [Str::contains($uri, 'hair-guide') ? 'content.guides.manage' : 'content.catalog.manage'];
        if (Str::startsWith($uri, ['news', 'news-page'])) return ['content.news.manage'];
        if (Str::startsWith($uri, ['guides', 'guides-page'])) return ['content.guides.manage'];

        return null;
    }
}
