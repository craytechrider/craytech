<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'total_pieces',
                'available_pieces',
                'price_per_piece',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('total_pieces')->default(0);
            $table->unsignedInteger('available_pieces')->default(0);
            $table->decimal('price_per_piece', 10, 2)->default(0);
        });
    }
};
