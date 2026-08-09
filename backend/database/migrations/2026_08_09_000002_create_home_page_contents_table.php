<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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
            $table->boolean('announcement_enabled')->default(true);
            $table->timestamps();
        });

        DB::table('home_page_contents')->insert([
            'page_key' => 'home',
            'announcement_messages' => json_encode([
                'Miễn phí giao hàng cho đơn từ 1.000.000đ',
                'Tư vấn lựa chọn theo phong cách riêng',
            ], JSON_UNESCAPED_UNICODE),
            'announcement_interval_seconds' => 5,
            'announcement_enabled' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('home_page_contents');
    }
};
