<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Area extends Model
{
    protected $fillable = [
        'name',
        'area_type_id',
        'capacity',
        'occupied',
        'crayfish_type_id',
        'total_crayfish',
    ];

    public function areaType()
    {
        return $this->belongsTo(AreaType::class);
    }

    public function crayfishType()
    {
        return $this->belongsTo(CrayfishType::class);
    }

    public function histories()
    {
        return $this->hasMany(AreaHistory::class);
    }

    public function batches()
    {
        return $this->hasMany(Batch::class);
    }

    public function activeBatches()
    {
        return $this->hasMany(Batch::class)->where('status', 'active');
    }
}
