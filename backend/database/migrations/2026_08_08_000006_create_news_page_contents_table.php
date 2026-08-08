<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('news_page_contents', function (Blueprint $table) {
            $table->id();
            $table->string('page_key', 60)->unique()->default('news');
            $table->string('eyebrow', 120)->nullable();
            $table->string('title', 190)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('featured_article_id')->nullable()->constrained('news_articles')->nullOnDelete();
            $table->string('featured_badge_label', 120)->nullable();
            $table->string('list_eyebrow', 120)->nullable();
            $table->string('list_title', 190)->nullable();
            $table->text('list_description')->nullable();
            $table->boolean('show_cta')->default(true);
            $table->string('cta_eyebrow', 120)->nullable();
            $table->string('cta_title', 190)->nullable();
            $table->text('cta_description')->nullable();
            $table->string('cta_primary_label', 120)->nullable();
            $table->string('cta_primary_url', 500)->nullable();
            $table->string('cta_secondary_label', 120)->nullable();
            $table->string('cta_secondary_url', 500)->nullable();
            $table->string('cta_image_path')->nullable();
            $table->string('cta_image_alt', 190)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('news_page_contents');
    }
};
