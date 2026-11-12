<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // payment_method
        if (!Schema::hasColumn('orders', 'payment_method')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('payment_method')
                    ->default('cod')
                    ->after('status');
            });
        }

        // payment_status
        if (!Schema::hasColumn('orders', 'payment_status')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('payment_status')
                    ->default('pending')
                    ->after('payment_method');
            });
        }

        // paymongo_checkout_id
        if (!Schema::hasColumn('orders', 'paymongo_checkout_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('paymongo_checkout_id')
                    ->nullable()
                    ->after('payment_status');
            });
        }

        // paymongo_payment_id
        if (!Schema::hasColumn('orders', 'paymongo_payment_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('paymongo_payment_id')
                    ->nullable()
                    ->after('paymongo_checkout_id');
            });
        }

        // total_amount
        if (!Schema::hasColumn('orders', 'total_amount')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->decimal(
                    'total_amount',
                    12,
                    2
                )
                    ->default(0)
                    ->after('paymongo_payment_id');
            });
        }
    }

    public function down(): void
    {
        $columns = [
            'payment_method',
            'payment_status',
            'paymongo_checkout_id',
            'paymongo_payment_id',
            'total_amount',
        ];

        foreach ($columns as $column) {
            if (Schema::hasColumn('orders', $column)) {
                Schema::table('orders', function (Blueprint $table) use ($column) {
                    $table->dropColumn($column);
                });
            }
        }
    }
};
