<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('delivery_areas')) {
            Schema::create('delivery_areas', function (Blueprint $table) {
                $table->id();

                $table->string('country')
                    ->default('Philippines');

                $table->string('region');

                $table->string('province');

                $table->string('municipality');

                $table->boolean('is_active')
                    ->default(true);

                $table->timestamps();

                $table->unique([
                    'country',
                    'region',
                    'province',
                    'municipality',
                ]);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_areas');
    }
};
