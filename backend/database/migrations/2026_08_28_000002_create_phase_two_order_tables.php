<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('from_status')->nullable();
            $table->string('to_status')->index();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
            $table->index(['order_id', 'created_at']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('method');
            $table->string('provider')->default('manual');
            $table->decimal('amount', 12, 2);
            $table->string('status')->default('pending')->index();
            $table->string('transaction_code')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('carrier');
            $table->string('tracking_number')->nullable();
            $table->decimal('shipping_fee_actual', 12, 2)->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->string('tracking_url', 1000)->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('store_settings', function (Blueprint $table) {
            $table->boolean('bank_transfer_enabled')->default(true);
            $table->string('bank_name')->nullable();
            $table->string('bank_account_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_branch')->nullable();
            $table->string('bank_qr_path')->nullable();
            $table->text('bank_transfer_note')->nullable();
        });

        DB::table('orders')->orderBy('id')->chunkById(100, function ($orders) {
            foreach ($orders as $order) {
                DB::table('order_status_histories')->insertOrIgnore([
                    'order_id' => $order->id,
                    'from_status' => null,
                    'to_status' => $order->order_status,
                    'changed_by' => null,
                    'note' => 'Trạng thái hiện tại trước khi bật lịch sử đơn hàng.',
                    'created_at' => $order->created_at,
                ]);
                DB::table('payments')->insertOrIgnore([
                    'order_id' => $order->id,
                    'method' => $order->payment_method,
                    'provider' => 'manual',
                    'amount' => $order->total_amount,
                    'status' => match ($order->payment_status) {
                        'paid' => 'paid',
                        'refunded' => 'refunded',
                        default => 'pending',
                    },
                    'created_at' => $order->created_at,
                    'updated_at' => $order->updated_at,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->dropColumn(['bank_transfer_enabled', 'bank_name', 'bank_account_name', 'bank_account_number', 'bank_branch', 'bank_qr_path', 'bank_transfer_note']);
        });
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_status_histories');
    }
};
