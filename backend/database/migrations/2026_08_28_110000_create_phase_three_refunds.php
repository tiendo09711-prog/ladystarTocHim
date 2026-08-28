<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('payment_id')->constrained()->restrictOnDelete();
            $table->foreignId('return_request_id')->nullable()->constrained()->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('status')->default('pending')->index();
            $table->string('method');
            $table->string('transaction_code')->nullable();
            $table->text('reason')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamp('requested_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['payment_id', 'status']);
            $table->index(['return_request_id', 'status']);
        });

        DB::table('payments')->where('status', 'refunded')->orderBy('id')->chunkById(100, function ($payments) {
            foreach ($payments as $payment) {
                if (DB::table('refunds')->where('payment_id', $payment->id)->where('status', 'completed')->exists()) {
                    continue;
                }
                DB::table('refunds')->insert([
                    'code' => 'RF-LEGACY-'.$payment->id, 'order_id' => $payment->order_id, 'payment_id' => $payment->id,
                    'amount' => $payment->amount, 'status' => 'completed', 'method' => 'manual',
                    'reason' => 'Phase 3 legacy refunded payment backfill', 'requested_at' => $payment->updated_at,
                    'completed_at' => $payment->updated_at, 'created_at' => $payment->updated_at, 'updated_at' => $payment->updated_at,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
