<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('after_sales_media', function (Blueprint $table) {
            $table->string('disk', 40)->default('public')->after('path');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('cost_price_snapshot', 12, 2)->nullable()->after('unit_price');
        });
    }

    public function down(): void
    {
        Schema::table('after_sales_media', function (Blueprint $table) {
            $table->dropColumn('disk');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('cost_price_snapshot');
        });
    }
};
