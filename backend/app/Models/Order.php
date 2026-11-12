<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [

        'order_number',
        'user_id',

        'customer_name',
        'customer_contact',

        'order_type',
        'status',

        'delivery_method',
        'delivery_address_id',

        'delivery_personnel_id',
        'delivery_status',
        'assigned_at',
        'delivered_at',

        'delivery_proof_image',

        'customer_note',

        'payment_method',
        'payment_status',

        'paymongo_checkout_id',
        'paymongo_payment_id',

        'total_amount',

        // Cancellation fields
        'cancellation_status',
        'cancellation_reason',
        'cancellation_requested_at',
        'cancellation_reviewed_at',
        'cancellation_reviewed_by',
        'cancellation_admin_note',

        // Refund fields
        'refund_status',
        'refund_reference',
        'refund_amount',
        'refunded_at',
        'refund_recorded_by',
    ];
    /*
    |--------------------------------------------------------------------------
    | ROUTE MODEL BINDING
    |--------------------------------------------------------------------------
    |
    | Allows routes to use:
    |
    | /orders/CRY-20260822100740-DVKWW
    |
    | instead of:
    |
    | /orders/31
    |
    */

    public function getRouteKeyName()
    {
        return 'order_number';
    }

    /*
    |--------------------------------------------------------------------------
    | ORDER ITEMS
    |--------------------------------------------------------------------------
    */

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER / USER
    |--------------------------------------------------------------------------
    */

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /*
    |--------------------------------------------------------------------------
    | DELIVERY ADDRESS
    |--------------------------------------------------------------------------
    */

    public function deliveryAddress()
    {
        return $this->belongsTo(
            DeliveryAddress::class,
            'delivery_address_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DELIVERY PERSONNEL
    |--------------------------------------------------------------------------
    |
    | The delivery_personnel_id points to the users table.
    |
    | Only users whose role is "delivery" should be assigned
    | through the OrderController.
    |
    */

    public function deliveryPersonnel()
    {
        return $this->belongsTo(
            User::class,
            'delivery_personnel_id'
        );
    }
}
