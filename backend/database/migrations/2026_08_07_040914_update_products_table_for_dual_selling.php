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
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'selling_type',
                'price',
                'quantity',
            ]);

            $table->unsignedInteger('total_pieces')->after('description');
            $table->decimal('total_weight_kg', 10, 2)->after('total_pieces');

            $table->decimal('price_per_piece', 10, 2)->after('total_weight_kg');
            $table->decimal('price_per_kg', 10, 2)->after('price_per_piece');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
