<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('news_articles', 'content_type')) {
            Schema::table('news_articles', function (Blueprint $table) {
                $table->string('content_type', 20)->default('news')->after('category')->index();
            });
        }

        DB::table('news_articles')->where('category', 'Ưu đãi')->update(['content_type' => 'promotion']);
        DB::table('news_articles')->where('category', 'Hướng dẫn')->update(['content_type' => 'guide']);
        DB::table('news_articles')->whereNotIn('content_type', ['news', 'promotion', 'guide'])->update(['content_type' => 'news']);
    }

    public function down(): void
    {
        if (Schema::hasColumn('news_articles', 'content_type')) {
            Schema::table('news_articles', function (Blueprint $table) {
                $table->dropIndex(['content_type']);
                $table->dropColumn('content_type');
            });
        }
    }
};
