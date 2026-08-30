<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->json('hair_finder_config')->nullable();
        });
        DB::table('store_settings')->whereNull('hair_finder_config')->update([
            'hair_finder_config' => json_encode(config('hair-finder'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);

        $this->ensureWishlistSupportIndexes();

        $this->dropLegacyWishlistUnique();
        Schema::table('wishlists', function (Blueprint $table) {
            $table->foreignId('product_variant_id')->nullable()->after('product_id')->constrained('product_variants')->cascadeOnDelete();
            $table->index(['user_id', 'product_id'], 'wishlists_user_product_phase6_index');
        });
        $expression = DB::getDriverName() === 'mysql'
            ? '(COALESCE(product_variant_id, 0))'
            : 'COALESCE(product_variant_id, 0)';
        DB::statement("CREATE UNIQUE INDEX wishlists_user_product_variant_unique ON wishlists (user_id, product_id, {$expression})");

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
            $table->dropIndex('wishlists_user_product_phase6_index');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('DELETE w_delete FROM wishlists AS w_delete INNER JOIN wishlists AS w_keep ON w_delete.user_id = w_keep.user_id AND w_delete.product_id = w_keep.product_id AND w_delete.id > w_keep.id');
        } else {
            DB::statement('DELETE FROM wishlists WHERE id NOT IN (SELECT MIN(id) FROM wishlists GROUP BY user_id, product_id)');
        }

        Schema::table('wishlists', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_variant_id');
            $table->unique(['user_id', 'product_id'], 'wishlist_user_product_unique');
        });

        Schema::table('store_settings', function (Blueprint $table) {
            $table->dropColumn('hair_finder_config');
        });
    }

    private function dropLegacyWishlistUnique(): void
    {
        foreach (Schema::getIndexes('wishlists') as $index) {
            $columns = array_values($index['columns'] ?? []);
            if (($index['unique'] ?? false) && $columns === ['user_id', 'product_id']) {
                Schema::table('wishlists', fn (Blueprint $table) => $table->dropUnique($index['name']));

                return;
            }
        }
    }

    private function ensureWishlistSupportIndexes(): void
    {
        $indexColumns = collect(Schema::getIndexes('wishlists'))
            ->map(fn (array $index) => array_values($index['columns'] ?? []));

        Schema::table('wishlists', function (Blueprint $table) use ($indexColumns) {
            if (! $indexColumns->containsStrict(['user_id'])) {
                $table->index('user_id', 'wishlists_user_id_phase6_index');
            }
            if (! $indexColumns->containsStrict(['product_id'])) {
                $table->index('product_id', 'wishlists_product_id_phase6_index');
            }
        });
    }
};
