<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_areas', function (Blueprint $table) {
            $table->string('barangay')
                ->after('municipality');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_areas', function (Blueprint $table) {
            $table->dropColumn('barangay');
        });
    }
};
