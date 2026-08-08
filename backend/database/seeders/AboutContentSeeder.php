<?php

namespace Database\Seeders;

use App\Models\AboutSection;
use App\Models\PageSeo;
use App\Support\AboutContent;
use Illuminate\Database\Seeder;

class AboutContentSeeder extends Seeder
{
    public function run(): void
    {
        foreach (AboutContent::sections() as $section) {
            $settings = $section['settings'] ?? null;
            unset($section['settings']);
            AboutSection::updateOrCreate(
                ['section_key' => $section['section_key']],
                $section + ['settings_json' => $settings, 'is_active' => true, 'published_at' => now()],
            );
        }

        foreach (AboutContent::seos() as $seo) {
            PageSeo::updateOrCreate(['page_key' => $seo['page_key']], $seo);
        }
    }
}
