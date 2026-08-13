<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news_articles', function (Blueprint $table) {
            $table->string('content_image_path')->nullable()->after('cover_image_alt');
            $table->string('content_image_alt', 190)->nullable()->after('content_image_path');
            $table->string('video_path')->nullable()->after('content_image_alt');
            $table->string('video_url', 500)->nullable()->after('video_path');
            $table->string('video_title', 190)->nullable()->after('video_url');
        });
    }

    public function down(): void
    {
        Schema::table('news_articles', function (Blueprint $table) {
            $table->dropColumn(['content_image_path', 'content_image_alt', 'video_path', 'video_url', 'video_title']);
        });
    }
};

