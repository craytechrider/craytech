<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AreaHistory extends Model
{
    protected $fillable = [
        'area_id',
        'action',
        'details',
        'user_id',
    ];

    public function area()
    {
        return $this->belongsTo(Area::class);
    }
}
