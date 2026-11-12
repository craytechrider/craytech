<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrayfishType extends Model
{
    protected $fillable = [
        'name',
        'description',
    ];
    public function areas()
    {
        return $this->hasMany(Area::class);
    }

    public function batches()
    {
        return $this->hasMany(Batch::class);
    }
}
