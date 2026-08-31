<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('categories', 'show_in_menu')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->boolean('show_in_menu')->default(false)->after('is_active');
            });
        }

        DB::table('store_settings')->whereNotNull('hair_finder_config')->orderBy('id')->each(function ($settings) {
            $config = json_decode($settings->hair_finder_config, true);
            if (! is_array($config) || ! isset($config['format']['currency'])) {
                return;
            }
            unset($config['format']['currency']);
            DB::table('store_settings')->where('id', $settings->id)->update(['hair_finder_config' => json_encode($config, JSON_UNESCAPED_UNICODE)]);
        });
    }

    public function down(): void
    {
        DB::table('store_settings')->whereNotNull('hair_finder_config')->orderBy('id')->each(function ($settings) {
            $config = json_decode($settings->hair_finder_config, true);
            if (! is_array($config)) {
                return;
            }
            $config['format'] = is_array($config['format'] ?? null) ? $config['format'] : [];
            $config['format']['currency'] = $settings->currency;
            DB::table('store_settings')->where('id', $settings->id)->update(['hair_finder_config' => json_encode($config, JSON_UNESCAPED_UNICODE)]);
        });

        if (Schema::hasColumn('categories', 'show_in_menu')) {
            Schema::table('categories', fn (Blueprint $table) => $table->dropColumn('show_in_menu'));
        }
    }
};