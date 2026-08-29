<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['order_status', 'completed_at'], 'orders_status_completed_at_index');
            $table->index(['branch_id', 'completed_at'], 'orders_branch_completed_at_index');
        });
        Schema::table('refunds', function (Blueprint $table) {
            $table->index(['status', 'completed_at'], 'refunds_status_completed_at_index');
        });
        Schema::table('order_items', function (Blueprint $table) {
            $table->index(['order_id', 'product_id'], 'order_items_order_product_index');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_status_completed_at_index');
            $table->dropIndex('orders_branch_completed_at_index');
        });
        Schema::table('refunds', function (Blueprint $table) {
            $table->dropIndex('refunds_status_completed_at_index');
        });
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex('order_items_order_product_index');
        });
    }
};
