<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('catalog_page_contents')
            ->where('page_key', 'hair-guide')
            ->where('title', 'Tìm lựa chọn phù hợp với nhu cầu của bạn')
            ->update(['title' => 'Dịch vụ chăm sóc tóc phù hợp với bạn']);

        DB::table('page_seos')
            ->where('page_key', 'hair-guide')
            ->where('title', 'Hướng dẫn chọn tóc | LADYSTARS')
            ->update([
                'title' => 'Dịch vụ chăm sóc tóc | LADYSTARS',
                'description' => 'Khám phá dịch vụ chăm sóc tóc phù hợp với nhu cầu và thói quen sử dụng của bạn.',
            ]);
    }

    public function down(): void
    {
        DB::table('catalog_page_contents')
            ->where('page_key', 'hair-guide')
            ->where('title', 'Dịch vụ chăm sóc tóc phù hợp với bạn')
            ->update(['title' => 'Tìm lựa chọn phù hợp với nhu cầu của bạn']);

        DB::table('page_seos')
            ->where('page_key', 'hair-guide')
            ->where('title', 'Dịch vụ chăm sóc tóc | LADYSTARS')
            ->update([
                'title' => 'Hướng dẫn chọn tóc | LADYSTARS',
                'description' => 'Tìm lựa chọn tóc phù hợp với nhu cầu và thói quen sử dụng của bạn.',
            ]);
    }
};
