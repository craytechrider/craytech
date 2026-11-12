<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('role', 'customer')
            ->whereNull('email_verified_at')
            ->update([
                'email_verified_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Intentionally do not unverify existing customer accounts.
    }
};
