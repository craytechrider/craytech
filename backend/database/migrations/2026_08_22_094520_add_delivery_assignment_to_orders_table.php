<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            $table->foreignId('delivery_personnel_id')
                ->nullable()
                ->after('delivery_address_id')
                ->constrained('users')
                ->nullOnDelete();

            $table->enum('delivery_status', [
                'pending',
                'assigned',
                'out_for_delivery',
                'delivered',
                'failed',
            ])
                ->default('pending')
                ->after('delivery_personnel_id');

            $table->timestamp('assigned_at')
                ->nullable()
                ->after('delivery_status');

            $table->timestamp('delivered_at')
                ->nullable()
                ->after('assigned_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            $table->dropForeign([
                'delivery_personnel_id',
            ]);

            $table->dropColumn([
                'delivery_personnel_id',
                'delivery_status',
                'assigned_at',
                'delivered_at',
            ]);
        });
    }
};
