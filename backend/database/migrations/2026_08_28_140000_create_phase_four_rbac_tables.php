<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->string('group_name')->index();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('permission_staff_role', function (Blueprint $table) {
            $table->foreignId('staff_role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['staff_role_id', 'permission_id']);
        });

        Schema::create('staff_role_user', function (Blueprint $table) {
            $table->foreignId('staff_role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['staff_role_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_role_user');
        Schema::dropIfExists('permission_staff_role');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('staff_roles');
    }
};
