<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN role
            ENUM('admin', 'customer', 'delivery', 'super_admin')
            NOT NULL DEFAULT 'customer'
        ");
    }

    public function down(): void
    {
        // Do not remove the role if any user is still a super_admin.
        DB::statement("
            UPDATE users
            SET role = 'admin'
            WHERE role = 'super_admin'
        ");

        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN role
            ENUM('admin', 'customer', 'delivery')
            NOT NULL DEFAULT 'customer'
        ");
    }
};
