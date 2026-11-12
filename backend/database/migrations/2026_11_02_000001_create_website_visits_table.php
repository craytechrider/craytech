
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('website_visits', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            $table->string('visitor_hash', 64);
            $table->string('session_key', 100);

            // Reduced from 2048 to avoid MySQL index size limits.
            $table->string('path', 500);

            // Referrer is not included in the composite index.
            $table->string('referrer', 2048)->nullable();

            $table->timestamp('viewed_at')->useCurrent();

            $table->timestamps();

            $table->index(['viewed_at', 'path']);
            $table->index('visitor_hash');
            $table->index('session_key');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_visits');
    }
};
