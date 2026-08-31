<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('store_settings', 'cod_enabled')) {
            Schema::table('store_settings', function (Blueprint $table) {
                $table->boolean('cod_enabled')->default(false)->after('bank_transfer_enabled');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('store_settings', 'cod_enabled')) {
            Schema::table('store_settings', fn (Blueprint $table) => $table->dropColumn('cod_enabled'));
        }
    }
};
