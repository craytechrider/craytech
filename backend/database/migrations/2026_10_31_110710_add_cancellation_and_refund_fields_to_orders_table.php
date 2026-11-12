<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Customer cancellation request
            $table->string('cancellation_status')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('cancellation_requested_at')->nullable();
            $table->timestamp('cancellation_reviewed_at')->nullable();
            $table->unsignedBigInteger('cancellation_reviewed_by')->nullable();
            $table->text('cancellation_admin_note')->nullable();

            // Manual PayMongo refund tracking
            $table->string('refund_status')->nullable();
            $table->string('refund_reference')->nullable();
            $table->decimal('refund_amount', 10, 2)->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->unsignedBigInteger('refund_recorded_by')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'cancellation_status',
                'cancellation_reason',
                'cancellation_requested_at',
                'cancellation_reviewed_at',
                'cancellation_reviewed_by',
                'cancellation_admin_note',
                'refund_status',
                'refund_reference',
                'refund_amount',
                'refunded_at',
                'refund_recorded_by',
            ]);
        });
    }
};
