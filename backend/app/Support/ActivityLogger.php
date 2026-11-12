<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

class ActivityLogger
{
    public static function log(
        string $action,
        string $description,
        ?User $user = null,
        array $properties = [],
        ?string $userName = null
    ): void {
        try {
            if (!Schema::hasTable('activity_logs')) {
                return;
            }

            $data = [
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? $userName,
                'action' => $action,
                'description' => $description,
                'properties' => $properties ?: null,
            ];

            if (Schema::hasColumn('activity_logs', 'ip_address')) {
                $data['ip_address'] = request()->ip();
            }

            ActivityLog::create($data);
        } catch (\Throwable $e) {
            // Audit logging should never interrupt login or password reset.
            report($e);
        }
    }
}
