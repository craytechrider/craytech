<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BatchUpdate extends Model
{
    protected $fillable = [
        'batch_id',
        'population',
        'mortality_rate',
    ];

    protected $casts = [
        'population' => 'integer',
        'mortality_rate' => 'float',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
