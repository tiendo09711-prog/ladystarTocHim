<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attributes', function (Blueprint $table) {
            $table->string('display_style')->nullable()->after('type');
            $table->unsignedInteger('sort_order')->default(0)->after('display_style');
        });

        Schema::table('attribute_values', function (Blueprint $table) {
            $table->string('option_code', 80)->nullable()->after('display_value');
            $table->text('description')->nullable()->after('option_code');
            $table->string('image_path')->nullable()->after('color_code');
            $table->string('image_alt')->nullable()->after('image_path');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->json('variant_snapshot')->nullable()->after('variant_description');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });

        Schema::table('coupon_usages', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('coupon_usages', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });

        Schema::table('order_items', fn (Blueprint $table) => $table->dropColumn('variant_snapshot'));
        Schema::table('attribute_values', fn (Blueprint $table) => $table->dropColumn(['option_code', 'description', 'image_path', 'image_alt']));
        Schema::table('attributes', fn (Blueprint $table) => $table->dropColumn(['display_style', 'sort_order']));
    }
};
