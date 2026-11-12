<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            // Add the saved delivery address reference
            $table->foreignId('delivery_address_id')
                ->nullable()
                ->after('delivery_method')
                ->constrained('delivery_addresses')
                ->nullOnDelete();

            // Remove the old text address
            if (Schema::hasColumn('orders', 'delivery_address')) {
                $table->dropColumn('delivery_address');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            // Remove delivery address relationship
            if (Schema::hasColumn('orders', 'delivery_address_id')) {
                $table->dropForeign([
                    'delivery_address_id',
                ]);

                $table->dropColumn('delivery_address_id');
            }

            // Restore old text address
            if (!Schema::hasColumn('orders', 'delivery_address')) {
                $table->text('delivery_address')
                    ->nullable()
                    ->after('delivery_method');
            }
        });
    }
};
