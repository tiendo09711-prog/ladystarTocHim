<?php

namespace Database\Seeders;

use App\Models\StoreSetting;
use Illuminate\Database\Seeder;
use LogicException;

class HairFinderConfigSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('testing')) {
            throw new LogicException('HairFinderConfigSeeder is restricted to the testing environment.');
        }

        $settings = StoreSetting::query()->firstOrCreate([], ['store_name' => 'LADYSTARS', 'currency' => 'VND', 'shipping_fee' => 30000, 'free_shipping_from' => 1000000, 'low_stock_threshold' => 3, 'order_prefix' => 'LS', 'bank_transfer_enabled' => true, 'returns_enabled' => true, 'return_window_days' => 7, 'exchange_enabled' => true, 'exchange_window_days' => 7, 'refund_shipping_on_full_return' => false, 'warranty_enabled' => true, 'appointments_enabled' => true, 'appointment_cancel_before_hours' => 4, 'store_timezone' => 'Asia/Ho_Chi_Minh']);
        if (! $settings->hair_finder_config) {
            $settings->update(['hair_finder_config' => require base_path('tests/Fixtures/hair-finder.php')]);
        }
    }
}
