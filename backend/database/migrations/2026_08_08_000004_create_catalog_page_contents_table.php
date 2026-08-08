<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_page_contents', function (Blueprint $table) {
            $table->id();
            $table->string('page_key', 80)->unique();
            $table->foreignId('category_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('eyebrow', 120)->nullable();
            $table->string('title', 190)->nullable();
            $table->text('subtitle')->nullable();
            $table->string('hero_image_path')->nullable();
            $table->string('hero_image_alt')->nullable();
            $table->string('editorial_title', 190)->nullable();
            $table->text('editorial_intro')->nullable();
            $table->json('editorial_sections_json')->nullable();
            $table->string('consultation_title', 190)->nullable();
            $table->text('consultation_body')->nullable();
            $table->string('consultation_image_path')->nullable();
            $table->string('consultation_image_alt')->nullable();
            $table->string('consultation_cta_label', 120)->nullable();
            $table->json('settings_json')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_page_contents');
    }
};
