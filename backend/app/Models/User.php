<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'mobile_number',
        'business_name',
        'role',
        'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'failed_login_attempts' => 'integer',
            'locked_until' => 'datetime',
        ];
    }

    public function deliveryAddresses(): HasMany
    {
        return $this->hasMany(DeliveryAddress::class);
    }

    public function defaultDeliveryAddress()
    {
        return $this->hasOne(DeliveryAddress::class)->where('is_default', true);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }
    public function isDelivery(): bool
    {
        return $this->role === 'delivery';
    }
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }
    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }

    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class);
    }
    public function deviceTokens()
    {
        return $this->hasMany(\App\Models\DeviceToken::class);
    }
}
