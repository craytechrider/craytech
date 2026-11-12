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
        Schema::create('batches', function (Blueprint $table) {
            $table->id();

            $table->string('batch_name');

            $table->foreignId('area_id')
                ->constrained('areas')
                ->cascadeOnDelete();

            $table->foreignId('crayfish_type_id')
                ->constrained('crayfish_types')
                ->cascadeOnDelete();

            $table->integer('initial_population');

            $table->integer('current_population');

            $table->date('date_added');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};
