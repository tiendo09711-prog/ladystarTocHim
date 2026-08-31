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
            $table->string('store_name')->nullable();
            $table->string('support_phone')->nullable();
            $table->string('support_email')->nullable();
            $table->text('store_address')->nullable();
            $table->string('currency', 3)->default('');
            $table->decimal('shipping_fee', 12, 2)->default(0);
            $table->decimal('free_shipping_from', 12, 2)->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(0);
            $table->string('order_prefix', 12)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_settings');
    }
};
