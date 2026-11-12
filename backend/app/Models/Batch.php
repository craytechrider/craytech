<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Batch extends Model
{
    protected $fillable = [
        'batch_name',
        'area_id',
        'crayfish_type_id',
        'initial_population',
        'current_population',
        'date_added',
        'status',
        'date_released',
        'release_remarks',
    ];

    protected $casts = [
        'date_added' => 'date',
        'date_released' => 'date',
        'initial_population' => 'integer',
        'current_population' => 'integer',
    ];

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function crayfishType(): BelongsTo
    {
        return $this->belongsTo(CrayfishType::class);
    }

    public function updates(): HasMany
    {
        return $this->hasMany(BatchUpdate::class);
    }
}
