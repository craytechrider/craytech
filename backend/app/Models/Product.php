<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'batch_id',
        'name',
        'description',
        'total_weight_kg',
        'available_weight_kg',
        'price_per_kg',
        'image',
        'status',
        'is_available',
    ];

    protected $casts = [
        'total_weight_kg' => 'decimal:2',
        'available_weight_kg' => 'decimal:2',
        'price_per_kg' => 'decimal:2',
        'status' => 'boolean',
        'is_available' => 'boolean',
    ];

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
