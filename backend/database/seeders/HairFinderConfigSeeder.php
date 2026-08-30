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

        $settings = StoreSetting::current();
        if (! $settings->hair_finder_config) {
            $settings->update(['hair_finder_config' => config('hair-finder')]);
        }
    }
}
