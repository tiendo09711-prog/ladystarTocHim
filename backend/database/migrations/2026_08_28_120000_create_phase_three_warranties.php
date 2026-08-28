<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('warranty_days')->nullable()->after('warranty_information');
        });
        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedInteger('warranty_days_snapshot')->nullable()->after('variant_snapshot');
        });
        Schema::create('warranty_requests', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('order_item_id')->constrained()->restrictOnDelete();
            $table->string('status')->default('requested')->index();
            $table->string('issue_type');
            $table->text('description');
            $table->string('requested_resolution')->nullable();
            $table->string('actual_resolution')->nullable();
            $table->foreignId('replacement_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->foreignId('receiving_branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->text('customer_note')->nullable();
            $table->text('admin_note')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('requested_at')->index();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('replacement_reserved_at')->nullable();
            $table->timestamp('replacement_released_at')->nullable();
            $table->timestamp('replacement_consumed_at')->nullable();
            $table->timestamps();
            $table->index(['order_item_id', 'status']);
            $table->index(['user_id', 'requested_at']);
        });
        Schema::table('after_sales_shipments', function (Blueprint $table) {
            $table->index('warranty_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('after_sales_shipments', function (Blueprint $table) {
            $table->dropIndex(['warranty_request_id']);
        });
        Schema::dropIfExists('warranty_requests');
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('warranty_days_snapshot');
        });
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('warranty_days');
        });
    }
};
