<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_page_contents', function (Blueprint $table) {
            $table->id();
            $table->string('page_key', 60)->unique()->default('store-locations');
            $table->string('eyebrow', 120)->nullable();
            $table->string('title', 190)->nullable();
            $table->text('description')->nullable();
            $table->string('hero_image_path')->nullable();
            $table->string('hero_image_alt', 190)->nullable();
            $table->string('locations_eyebrow', 120)->nullable();
            $table->string('locations_title', 190)->nullable();
            $table->text('locations_description')->nullable();
            $table->string('empty_title', 190)->nullable();
            $table->text('empty_description')->nullable();
            $table->string('support_title', 190)->nullable();
            $table->text('support_description')->nullable();
            $table->string('process_eyebrow', 120)->nullable();
            $table->string('process_title', 190)->nullable();
            $table->text('process_description')->nullable();
            $table->string('policies_eyebrow', 120)->nullable();
            $table->string('policies_title', 190)->nullable();
            $table->text('policies_description')->nullable();
            $table->string('contact_eyebrow', 120)->nullable();
            $table->string('contact_title', 190)->nullable();
            $table->text('contact_description')->nullable();
            $table->string('contact_image_path')->nullable();
            $table->string('contact_image_alt', 190)->nullable();
            $table->json('settings_json')->nullable();
            $table->timestamps();
        });

        Schema::create('store_page_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_page_content_id')->constrained()->cascadeOnDelete();
            $table->string('item_type', 30)->index();
            $table->string('title', 190);
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->string('image_alt', 190)->nullable();
            $table->string('icon', 40)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->text('public_description')->nullable()->after('address_line');
            $table->string('opening_hours')->nullable()->after('public_description');
            $table->string('image_path')->nullable()->after('opening_hours');
            $table->string('image_alt', 190)->nullable()->after('image_path');
            $table->decimal('latitude', 10, 7)->nullable()->after('image_alt');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->string('booking_url', 500)->nullable()->after('longitude');
            $table->string('map_url', 500)->nullable()->after('booking_url');
            $table->boolean('show_on_store_page')->default(true)->after('map_url');
            $table->unsignedInteger('public_sort_order')->default(0)->after('show_on_store_page');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['public_description', 'opening_hours', 'image_path', 'image_alt', 'latitude', 'longitude', 'booking_url', 'map_url', 'show_on_store_page', 'public_sort_order']);
        });
        Schema::dropIfExists('store_page_items');
        Schema::dropIfExists('store_page_contents');
    }
};
