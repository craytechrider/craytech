<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryArea extends Model
{
    protected $fillable = [
        'country',
        'region',
        'province',
        'municipality',
        'barangay',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
