<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_page_contents', function (Blueprint $table) {
            $table->id();
            $table->string('page_key', 60)->unique()->default('home');
            $table->json('announcement_messages');
            $table->unsignedTinyInteger('announcement_interval_seconds')->default(5);
            $table->boolean('announcement_enabled')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_page_contents');
    }
};
