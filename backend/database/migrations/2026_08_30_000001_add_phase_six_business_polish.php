<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->json('hair_finder_config')->nullable();
        });

        Schema::table('wishlists', function (Blueprint $table) {
            $table->index('user_id', 'wishlists_user_id_phase6_index');
            $table->index('product_id', 'wishlists_product_id_phase6_index');
        });

        Schema::table('wishlists', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'product_id']);
            $table->foreignId('product_variant_id')->nullable()->after('product_id')->constrained('product_variants')->cascadeOnDelete();
            $table->index(['user_id', 'product_id']);
            $table->unique(['user_id', 'product_id', 'product_variant_id'], 'wishlists_user_product_variant_unique');
        });

        Schema::create('customer_tags', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80)->unique();
            $table->timestamps();
        });

        Schema::create('customer_tag_user', function (Blueprint $table) {
            $table->foreignId('customer_tag_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['customer_tag_id', 'user_id']);
        });

        Schema::create('customer_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('staff_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('content');
            $table->timestamps();
            $table->index(['customer_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_notes');
        Schema::dropIfExists('customer_tag_user');
        Schema::dropIfExists('customer_tags');

        Schema::table('wishlists', function (Blueprint $table) {
            $table->dropUnique('wishlists_user_product_variant_unique');
            $table->dropIndex(['user_id', 'product_id']);
            $table->dropConstrainedForeignId('product_variant_id');
            $table->unique(['user_id', 'product_id']);
            $table->dropIndex('wishlists_user_id_phase6_index');
            $table->dropIndex('wishlists_product_id_phase6_index');
        });

        Schema::table('store_settings', function (Blueprint $table) {
            $table->dropColumn('hair_finder_config');
        });
    }
};
