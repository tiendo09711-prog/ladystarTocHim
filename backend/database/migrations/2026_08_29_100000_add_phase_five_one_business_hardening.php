<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('order_source')->default('web')->index();
            $table->string('coupon_code')->nullable()->index();
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->text('return_reason')->nullable();
        });

        Schema::table('refunds', function (Blueprint $table) {
            $table->string('source')->default('return')->index();
            $table->index(['order_id', 'source', 'status']);
        });

        Schema::table('return_items', function (Blueprint $table) {
            $table->decimal('original_value', 12, 2)->nullable();
            $table->decimal('replacement_value', 12, 2)->nullable();
            $table->decimal('price_difference', 12, 2)->nullable();
        });

        Schema::table('warranty_requests', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->default(1);
        });

        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->string('reason_code')->nullable()->index();
        });

        DB::table('refunds')->whereNull('return_request_id')->update(['source' => 'manual']);
    }

    public function down(): void
    {
        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->dropIndex(['reason_code']);
            $table->dropColumn('reason_code');
        });

        Schema::table('warranty_requests', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });

        Schema::table('return_items', function (Blueprint $table) {
            $table->dropColumn(['original_value', 'replacement_value', 'price_difference']);
        });

        Schema::table('refunds', function (Blueprint $table) {
            $table->dropIndex(['order_id', 'source', 'status']);
            $table->dropIndex(['source']);
            $table->dropColumn('source');
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['failed_at', 'returned_at', 'failure_reason', 'return_reason']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['order_source']);
            $table->dropIndex(['coupon_code']);
            $table->dropColumn(['order_source', 'coupon_code']);
        });
    }
};
