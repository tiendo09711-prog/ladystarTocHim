<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news_page_contents', function (Blueprint $table) {
            $table->string('hero_image_path')->nullable()->after('description');
            $table->string('hero_image_alt', 190)->nullable()->after('hero_image_path');
        });
    }

    public function down(): void
    {
        Schema::table('news_page_contents', function (Blueprint $table) {
            $table->dropColumn(['hero_image_path', 'hero_image_alt']);
        });
    }
};
