<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultation_requests', function (Blueprint $table) {
            $table->foreignId('service_id')->nullable()->after('category_id')->constrained('services')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('consultation_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_id');
        });
    }
};
