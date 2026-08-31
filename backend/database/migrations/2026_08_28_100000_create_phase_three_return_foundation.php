<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->boolean('returns_enabled')->default(false);
            $table->unsignedInteger('return_window_days')->default(0);
            $table->boolean('exchange_enabled')->default(false);
            $table->unsignedInteger('exchange_window_days')->default(0);
            $table->boolean('refund_shipping_on_full_return')->default(false);
            $table->boolean('warranty_enabled')->default(false);
            $table->boolean('appointments_enabled')->default(false);
            $table->unsignedInteger('appointment_cancel_before_hours')->default(0);
            $table->string('store_timezone')->nullable();
        });

        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('request_type')->index();
            $table->string('status')->default('requested')->index();
            $table->foreignId('receiving_branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->text('customer_note')->nullable();
            $table->text('admin_note')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('requested_at')->index();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->index(['order_id', 'request_type', 'status']);
            $table->index(['user_id', 'requested_at']);
        });

        Schema::create('return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->string('reason_code');
            $table->text('reason_detail')->nullable();
            $table->string('condition_status')->nullable();
            $table->boolean('restockable')->nullable();
            $table->foreignId('replacement_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->decimal('unit_refund_amount', 12, 2)->nullable();
            $table->decimal('refund_amount', 12, 2)->nullable();
            $table->timestamp('restocked_at')->nullable();
            $table->timestamp('replacement_reserved_at')->nullable();
            $table->timestamp('replacement_released_at')->nullable();
            $table->timestamp('replacement_consumed_at')->nullable();
            $table->timestamps();
            $table->unique(['return_request_id', 'order_item_id']);
        });

        Schema::create('after_sales_media', function (Blueprint $table) {
            $table->id();
            $table->morphs('mediable');
            $table->string('path');
            $table->string('mime_type', 100);
            $table->string('original_name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('after_sales_shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('return_request_id')->nullable()->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('warranty_request_id')->nullable();
            $table->string('purpose');
            $table->string('carrier')->nullable();
            $table->string('tracking_number')->nullable();
            $table->decimal('shipping_fee_actual', 12, 2)->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->string('tracking_url', 1000)->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['return_request_id', 'purpose']);
            $table->unique(['warranty_request_id', 'purpose']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('after_sales_shipments');
        Schema::dropIfExists('after_sales_media');
        Schema::dropIfExists('return_items');
        Schema::dropIfExists('return_requests');
        Schema::table('store_settings', function (Blueprint $table) {
            $table->dropColumn([
                'returns_enabled', 'return_window_days', 'exchange_enabled', 'exchange_window_days',
                'refund_shipping_on_full_return', 'warranty_enabled', 'appointments_enabled',
                'appointment_cancel_before_hours', 'store_timezone',
            ]);
        });
    }
};
