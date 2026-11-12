<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id', 'user_name', 'action', 'description',
        'subject_type', 'subject_id', 'properties', 'ip_address',
    ];

    protected $casts = [
        'properties' => 'array',
    ];
}
