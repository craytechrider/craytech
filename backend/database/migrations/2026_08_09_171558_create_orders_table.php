<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            // Customer account
            // Nullable because walk-in customers don't need an account
            $table->foreignId('user_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            $table->string('order_number')->unique();

            // online = customer ordered through the website
            // walk_in = admin/staff manually entered the order
            $table->enum('order_type', [
                'online',
                'walk_in',
            ])->default('online');

            $table->enum('status', [
                'pending',
                'confirmed',
                'processing',
                'ready',
                'completed',
                'cancelled',
            ])->default('pending');

            // Pickup or delivery
            $table->enum('delivery_method', [
                'pickup',
                'delivery',
            ])->default('pickup');

            // Only needed for delivery
            $table->text('delivery_address')->nullable();

            // Optional customer note
            $table->text('customer_note')->nullable();

            // For walk-in customers
            $table->string('customer_name')->nullable();
            $table->string('customer_contact')->nullable();

            $table->decimal('total_amount', 10, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
