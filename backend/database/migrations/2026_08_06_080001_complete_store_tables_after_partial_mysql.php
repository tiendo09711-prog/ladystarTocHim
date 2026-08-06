<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('product_variant_attribute_values') && ! Schema::hasIndex('product_variant_attribute_values', ['product_variant_id', 'attribute_id'], 'unique')) {
            Schema::table('product_variant_attribute_values', fn (Blueprint $table) => $table->unique(['product_variant_id', 'attribute_id'], 'variant_attribute_unique'));
        }
        if (! Schema::hasTable('product_images')) {
            Schema::create('product_images', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
                $table->string('image_path');
                $table->string('alt_text')->nullable();
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('is_primary')->default(false);
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('branches')) {
            Schema::create('branches', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->unique();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('province')->nullable();
                $table->string('district')->nullable();
                $table->string('ward')->nullable();
                $table->string('address_line')->nullable();
                $table->boolean('is_default')->default(false);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('inventories')) {
            Schema::create('inventories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
                $table->unsignedInteger('quantity_on_hand')->default(0);
                $table->unsignedInteger('quantity_reserved')->default(0);
                $table->unsignedInteger('reorder_level')->default(3);
                $table->timestamps();
                $table->unique(['branch_id', 'product_variant_id'], 'branch_variant_inventory_unique');
            });
        }
        if (! Schema::hasTable('inventory_transactions')) {
            Schema::create('inventory_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained();
                $table->foreignId('product_variant_id')->constrained();
                $table->string('type')->index();
                $table->integer('quantity');
                $table->unsignedInteger('quantity_before');
                $table->unsignedInteger('quantity_after');
                $table->nullableMorphs('reference');
                $table->text('note')->nullable();
                $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('created_at')->useCurrent();
            });
        }
        if (! Schema::hasTable('carts')) {
            Schema::create('carts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('cart_items')) {
            Schema::create('cart_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
                $table->unsignedInteger('quantity');
                $table->decimal('unit_price', 12, 2);
                $table->timestamps();
                $table->unique(['cart_id', 'product_variant_id'], 'cart_variant_unique');
            });
        }
        if (! Schema::hasTable('wishlists')) {
            Schema::create('wishlists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->timestamp('created_at')->useCurrent();
                $table->unique(['user_id', 'product_id'], 'wishlist_user_product_unique');
            });
        }
        if (! Schema::hasTable('coupons')) {
            Schema::create('coupons', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('type');
                $table->decimal('value', 12, 2);
                $table->decimal('minimum_order_amount', 12, 2)->nullable();
                $table->decimal('maximum_discount_amount', 12, 2)->nullable();
                $table->unsignedInteger('usage_limit')->nullable();
                $table->unsignedInteger('usage_limit_per_user')->nullable();
                $table->unsignedInteger('used_count')->default(0);
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('orders')) {
            Schema::create('orders', function (Blueprint $table) {
                $table->id();
                $table->string('order_number')->unique();
                $table->foreignId('user_id')->constrained()->restrictOnDelete();
                $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
                $table->string('customer_name');
                $table->string('customer_email');
                $table->string('customer_phone');
                $table->string('province');
                $table->string('district');
                $table->string('ward');
                $table->string('shipping_address');
                $table->decimal('subtotal', 12, 2);
                $table->decimal('discount_amount', 12, 2)->default(0);
                $table->decimal('shipping_fee', 12, 2)->default(0);
                $table->decimal('total_amount', 12, 2);
                $table->string('payment_method');
                $table->string('payment_status')->default('unpaid')->index();
                $table->string('order_status')->default('pending')->index();
                $table->text('customer_note')->nullable();
                $table->text('admin_note')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('order_items')) {
            Schema::create('order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->restrictOnDelete();
                $table->foreignId('product_variant_id')->constrained()->restrictOnDelete();
                $table->string('product_name');
                $table->string('variant_description')->nullable();
                $table->string('sku');
                $table->string('barcode')->nullable();
                $table->decimal('unit_price', 12, 2);
                $table->unsignedInteger('quantity');
                $table->decimal('line_total', 12, 2);
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('order_item_id')->unique()->constrained()->cascadeOnDelete();
                $table->unsignedTinyInteger('rating');
                $table->string('title')->nullable();
                $table->text('content')->nullable();
                $table->string('status')->default('pending')->index();
                $table->text('admin_reply')->nullable();
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('coupon_usages')) {
            Schema::create('coupon_usages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->decimal('discount_amount', 12, 2);
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void {}
};
