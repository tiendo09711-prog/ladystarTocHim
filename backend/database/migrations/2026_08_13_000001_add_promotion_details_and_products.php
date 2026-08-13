<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news_articles', function (Blueprint $table) {
            $table->string('promotion_badge', 120)->nullable()->after('category');
            $table->text('promotion_conditions')->nullable()->after('promotion_badge');
            $table->timestamp('promotion_starts_at')->nullable()->after('promotion_conditions')->index();
            $table->timestamp('promotion_ends_at')->nullable()->after('promotion_starts_at')->index();
        });

        Schema::create('news_article_product', function (Blueprint $table) {
            $table->foreignId('news_article_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['news_article_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('news_article_product');
        Schema::table('news_articles', function (Blueprint $table) {
            $table->dropIndex(['promotion_starts_at']);
            $table->dropIndex(['promotion_ends_at']);
            $table->dropColumn(['promotion_badge', 'promotion_conditions', 'promotion_starts_at', 'promotion_ends_at']);
        });
    }
};
