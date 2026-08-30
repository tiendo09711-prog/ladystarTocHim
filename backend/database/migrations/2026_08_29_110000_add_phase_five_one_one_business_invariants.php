<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('after_sales_shipments', function (Blueprint $table) {
            $table->timestamp('failed_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->text('return_reason')->nullable();
        });

        Schema::table('return_items', function (Blueprint $table) {
            $table->timestamp('replacement_restocked_at')->nullable();
        });

        Schema::table('warranty_requests', function (Blueprint $table) {
            $table->timestamp('replacement_restocked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('warranty_requests', function (Blueprint $table) {
            $table->dropColumn('replacement_restocked_at');
        });

        Schema::table('return_items', function (Blueprint $table) {
            $table->dropColumn('replacement_restocked_at');
        });

        Schema::table('after_sales_shipments', function (Blueprint $table) {
            $table->dropColumn(['failed_at', 'failure_reason', 'returned_at', 'return_reason']);
        });
    }
};
