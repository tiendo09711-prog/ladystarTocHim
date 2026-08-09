<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('email', 'admin@namhair.local')->where('name', 'Quản trị Nam Hair')->update(['name' => 'Quản trị LADYSTARS']);
        DB::table('branches')->where('code', 'MAIN')->where('name', 'Nam Hair - Chi nhánh trung tâm')->update(['name' => 'LADYSTARS - Chi nhánh trung tâm']);
        DB::table('store_settings')->where('store_name', 'Nam Hair')->update(['store_name' => 'LADYSTARS']);
        DB::table('brands')->where('name', 'Nam Hair Select')->update(['name' => 'LADYSTARS Select', 'slug' => 'ladystars-select']);
        DB::table('categories')->where('description', 'like', '% tại Nam Hair')->update(['description' => DB::raw("REPLACE(description, ' tại Nam Hair', ' tại LADYSTARS')")]);
    }

    public function down(): void
    {
        DB::table('users')->where('email', 'admin@namhair.local')->where('name', 'Quản trị LADYSTARS')->update(['name' => 'Quản trị Nam Hair']);
        DB::table('branches')->where('code', 'MAIN')->where('name', 'LADYSTARS - Chi nhánh trung tâm')->update(['name' => 'Nam Hair - Chi nhánh trung tâm']);
        DB::table('store_settings')->where('store_name', 'LADYSTARS')->update(['store_name' => 'Nam Hair']);
        DB::table('brands')->where('name', 'LADYSTARS Select')->update(['name' => 'Nam Hair Select', 'slug' => 'nam-hair-select']);
        DB::table('categories')->where('description', 'like', '% tại LADYSTARS')->update(['description' => DB::raw("REPLACE(description, ' tại LADYSTARS', ' tại Nam Hair')")]);
    }
};
