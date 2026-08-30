<?php

namespace Database\Seeders;

use App\Models\StoreSetting;
use Illuminate\Database\Seeder;

class HairFinderConfigSeeder extends Seeder
{
    public function run(): void
    {
        $settings = StoreSetting::current();
        if (! $settings->hair_finder_config) {
            $settings->update(['hair_finder_config' => config('hair-finder')]);
        }
    }
}
