<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        /*
         * Add delivery to the existing role enum.
         *
         * Current:
         * admin, customer
         *
         * New:
         * admin, customer, delivery
         */
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin',
                'customer',
                'delivery',
            ])->default('customer')->change();

            /*
             * Active/inactive account status.
             *
             * Admin can disable a delivery account
             * without deleting the user.
             */
            $table->boolean('is_active')
                ->default(true)
                ->after('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            /*
             * Before rolling back, delivery users should
             * be changed to customer or removed manually.
             */
            $table->enum('role', [
                'admin',
                'customer',
            ])->default('customer')->change();

            $table->dropColumn('is_active');
        });
    }
};
