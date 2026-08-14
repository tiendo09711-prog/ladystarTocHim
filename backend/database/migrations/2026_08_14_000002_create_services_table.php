<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name', 190);
            $table->string('slug', 190)->unique();
            $table->text('short_description')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->string('image_path')->nullable();
            $table->string('image_alt', 190)->nullable();
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->string('status', 20)->default('active')->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
