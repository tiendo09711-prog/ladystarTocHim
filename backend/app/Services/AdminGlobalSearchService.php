<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Support\PhoneNormalizer;

class AdminGlobalSearchService
{
    public function search(User $actor, string $term, int $limit = 5): array
    {
        $term = trim($term);
        $like = '%'.$term.'%';
        $prefix = $term.'%';
        $phone = PhoneNormalizer::normalizeIfPossible($term);
        $result = [];

        if ($actor->hasPermission('orders.view')) {
            $result['orders'] = Order::query()->where(function ($query) use ($like, $phone) {
                $query->where('order_number', 'like', $like)->orWhere('customer_name', 'like', $like);
                if ($phone) $query->orWhere('customer_phone', 'like', '%'.$phone.'%');
            })->orderByRaw('CASE WHEN order_number = ? THEN 0 WHEN order_number LIKE ? THEN 1 ELSE 2 END', [$term, $prefix])->latest()->limit($limit)->get()->map(fn ($order) => [
                'id' => $order->id, 'title' => $order->order_number, 'subtitle' => $order->customer_name.' · '.$order->customer_phone, 'url' => '/admin/orders/'.$order->id,
            ])->values();
        }
        if ($actor->hasPermission('customers.view')) {
            $result['customers'] = User::where('role', 'user')->where(function ($query) use ($like, $phone) {
                $query->where('name', 'like', $like)->orWhere('email', 'like', $like);
                if ($phone) $query->orWhere('phone', 'like', '%'.$phone.'%');
            })->orderByRaw('CASE WHEN email = ? THEN 0 WHEN name LIKE ? THEN 1 ELSE 2 END', [$term, $prefix])->limit($limit)->get()->map(fn ($customer) => [
                'id' => $customer->id, 'title' => $customer->name, 'subtitle' => trim($customer->email.' · '.($customer->phone ?? '')), 'url' => '/admin/customers?customer='.$customer->id,
            ])->values();
        }
        if ($actor->hasPermission('products.view')) {
            $result['products'] = Product::where(fn ($query) => $query->where('name', 'like', $like)->orWhere('slug', 'like', $like)->orWhere('base_sku', 'like', $like))
                ->orderByRaw('CASE WHEN base_sku = ? THEN 0 WHEN name LIKE ? THEN 1 ELSE 2 END', [$term, $prefix])->limit($limit)->get()->map(fn ($product) => [
                    'id' => $product->id, 'title' => $product->name, 'subtitle' => $product->base_sku, 'url' => '/admin/products/'.$product->id.'/edit',
                ])->values();
            $result['variants'] = ProductVariant::with('product:id,name')->where(fn ($query) => $query->where('sku', 'like', $like)->orWhere('barcode', 'like', $like))
                ->orderByRaw('CASE WHEN sku = ? OR barcode = ? THEN 0 WHEN sku LIKE ? THEN 1 ELSE 2 END', [$term, $term, $prefix])->limit($limit)->get()->map(fn ($variant) => [
                    'id' => $variant->id, 'title' => $variant->sku, 'subtitle' => $variant->product?->name, 'url' => '/admin/products/'.$variant->product_id.'/edit',
                ])->values();
        }
        if ($actor->hasPermission('appointments.view')) {
            $result['appointments'] = Appointment::with('service:id,name')->where(function ($query) use ($term, $like, $phone) {
                $query->where('customer_name', 'like', $like)->orWhere('customer_email', 'like', $like);
                if (ctype_digit($term)) $query->orWhereKey((int) $term);
                if ($phone) $query->orWhere('customer_phone', 'like', '%'.$phone.'%');
            })->latest('start_at')->limit($limit)->get()->map(fn ($appointment) => [
                'id' => $appointment->id, 'title' => 'LS-APPT-'.$appointment->id.' · '.$appointment->customer_name, 'subtitle' => $appointment->service?->name.' · '.$appointment->start_at?->format('d/m/Y H:i'), 'url' => '/admin/appointments?appointment='.$appointment->id,
            ])->values();
        }

        return $result;
    }
}
