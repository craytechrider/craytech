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

            $table->enum('selling_type', ['piece', 'kilogram'])
                ->default('piece')
                ->after('description');

            $table->boolean('is_available')
                ->default(true)
                ->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {

            $table->dropColumn([
                'selling_type',
                'is_available'
            ]);
        });
    }
};
