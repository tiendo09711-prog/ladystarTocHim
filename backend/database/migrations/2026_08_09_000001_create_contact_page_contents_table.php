<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_page_contents', function (Blueprint $table) {
            $table->id();
            $table->string('page_key', 60)->unique()->default('contact');
            $table->string('hero_eyebrow', 120)->nullable();
            $table->string('hero_title', 190)->nullable();
            $table->text('hero_description')->nullable();
            $table->string('hero_image_path')->nullable();
            $table->string('hero_image_alt', 190)->nullable();
            $table->string('contact_eyebrow', 120)->nullable();
            $table->string('contact_title', 190)->nullable();
            $table->text('contact_description')->nullable();
            $table->string('commitments_eyebrow', 120)->nullable();
            $table->string('commitments_title', 190)->nullable();
            $table->text('commitments_description')->nullable();
            $table->string('guide_eyebrow', 120)->nullable();
            $table->string('guide_title', 190)->nullable();
            $table->text('guide_description')->nullable();
            $table->string('guide_image_path')->nullable();
            $table->string('guide_image_alt', 190)->nullable();
            $table->text('guide_quote')->nullable();
            $table->string('branches_eyebrow', 120)->nullable();
            $table->string('branches_title', 190)->nullable();
            $table->text('branches_description')->nullable();
            $table->string('form_eyebrow', 120)->nullable();
            $table->string('form_title', 190)->nullable();
            $table->text('form_description')->nullable();
            $table->json('settings_json')->nullable();
            $table->timestamps();
        });

        Schema::table('consultation_requests', function (Blueprint $table) {
            $table->string('service_name', 190)->nullable()->after('category_id');
            $table->foreignId('branch_id')->nullable()->after('service_name')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('consultation_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id');
            $table->dropColumn('service_name');
        });
        Schema::dropIfExists('contact_page_contents');
    }
};
