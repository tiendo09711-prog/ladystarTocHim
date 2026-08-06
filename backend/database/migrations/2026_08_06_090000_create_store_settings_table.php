<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_settings', function (Blueprint $table) {
            $table->id();
            $table->string('store_name');
            $table->string('support_phone')->nullable();
            $table->string('support_email')->nullable();
            $table->text('store_address')->nullable();
            $table->string('currency', 3)->default('VND');
            $table->decimal('shipping_fee', 12, 2)->default(30000);
            $table->decimal('free_shipping_from', 12, 2)->default(1000000);
            $table->unsignedInteger('low_stock_threshold')->default(3);
            $table->string('order_prefix', 12)->default('NH');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_settings');
    }
};
