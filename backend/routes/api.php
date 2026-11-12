<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FarmManagementController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\Api\SystemSettingController;
use App\Http\Controllers\Api\PayMongoController;
use App\Http\Controllers\Api\DeliveryAreaController;
use App\Http\Controllers\Api\DeliveryAddressController;
use App\Http\Controllers\Api\PhilippineLocationController;
use App\Http\Controllers\Api\DeliveryPersonnelController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\Api\SuperAdminController;
use App\Http\Controllers\Api\AdminManagementController;
use App\Http\Controllers\Api\WebsiteAnalyticsController;
use App\Http\Controllers\Api\DeviceTokenController;
use App\Http\Controllers\Api\NotificationController;


/*
|--------------------------------------------------------------------------
| Test
|--------------------------------------------------------------------------
*/

Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'Laravel API is working!',
    ]);
});


/*
|--------------------------------------------------------------------------
| Philippine Locations
|--------------------------------------------------------------------------
|
| Public because these are needed by registration/settings forms.
|
*/

Route::get('/locations/regions', [
    PhilippineLocationController::class,
    'regions'
]);

Route::get('/locations/{region}/provinces', [
    PhilippineLocationController::class,
    'provinces'
]);

Route::get(
    '/locations/{region}/provinces/{province}/municipalities',
    [
        PhilippineLocationController::class,
        'municipalities'
    ]
);

Route::get(
    '/locations/{region}/provinces/{province}/municipalities/{municipality}/barangays',
    [
        PhilippineLocationController::class,
        'barangays'
    ]
);


/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::post('/login', [
    AuthController::class,
    'login'
])->middleware('throttle:10,1');

Route::post('/register', [
    AuthController::class,
    'register'
]);
Route::post('/email/verify-code', [
    AuthController::class,
    'verifyEmailCode'
])->middleware('throttle:6,1');

Route::post('/email/resend-code', [
    AuthController::class,
    'resendVerificationCode'
])->middleware('throttle:3,1');

Route::post('/password/forgot', [
    PasswordResetController::class,
    'sendCode'
])->middleware('throttle:3,1');

Route::post('/password/reset', [
    PasswordResetController::class,
    'resetPassword'
])->middleware('throttle:6,1');

Route::post('/auth/social/exchange', [
    SocialAuthController::class,
    'exchange'
])->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| PAYMONGO WEBHOOK
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This MUST be outside auth:sanctum.
|
| PayMongo needs to access this endpoint directly.
|
*/

Route::post('/paymongo/webhook', [
    PayMongoController::class,
    'webhook'
]);


/*
|--------------------------------------------------------------------------
| PUBLIC STORE DATA
|--------------------------------------------------------------------------
|
| These GET endpoints are intentionally public so the
| Welcome page can display available products and
| available delivery areas without requiring login.
|
*/

Route::get('/products', [
    ProductController::class,
    'index'
]);

Route::get('/delivery-areas', [
    DeliveryAreaController::class,
    'index'
]);

/*
|--------------------------------------------------------------------------
| WEBSITE VISIT TRACKING
|--------------------------------------------------------------------------
| Public endpoint called by the React frontend to record page visits.
| Rate limited to reduce automated abuse.
*/

Route::post('/website-visits', [
    WebsiteAnalyticsController::class,
    'track'
])->middleware('throttle:60,1');


/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | PUSH NOTIFICATION DEVICE TOKENS
    |--------------------------------------------------------------------------
    */

    Route::post('/device-tokens', [
        DeviceTokenController::class,
        'store'
    ]);

    Route::delete('/device-tokens', [
        DeviceTokenController::class,
        'destroy'
    ]);

    /*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
*/

    Route::get('/notifications', [
        NotificationController::class,
        'index'
    ]);

    Route::get('/notifications/unread-count', [
        NotificationController::class,
        'unreadCount'
    ]);

    Route::patch('/notifications/read-all', [
        NotificationController::class,
        'markAllAsRead'
    ]);

    Route::patch('/notifications/{id}/read', [
        NotificationController::class,
        'markAsRead'
    ]);

    Route::delete('/notifications/{id}', [
        NotificationController::class,
        'destroy'
    ]);

    /*
    |--------------------------------------------------------------------------
    | Auth
    |--------------------------------------------------------------------------
    */

    Route::get('/user', [
        AuthController::class,
        'user'
    ]);

    Route::post('/logout', [
        AuthController::class,
        'logout'
    ]);


    /*
    |--------------------------------------------------------------------------
    | SUPER ADMIN - PLATFORM MANAGEMENT
    |--------------------------------------------------------------------------
    |
    | Requires a valid Sanctum token and the super_admin role.
    | Ordinary farm admins cannot access these endpoints.
    |
    */

    Route::middleware('role:super_admin')
        ->prefix('super-admin')
        ->group(function () {

            Route::get('/dashboard', [
                SuperAdminController::class,
                'dashboard'
            ]);

            Route::get('/users', [
                SuperAdminController::class,
                'users'
            ]);

            Route::get('/activity-logs', [
                SuperAdminController::class,
                'activityLogs'
            ]);

            Route::get('/system-health', [
                SuperAdminController::class,
                'systemHealth'
            ]);

            Route::get('/website-analytics', [
                WebsiteAnalyticsController::class,
                'index'
            ]);

            Route::get('/website-analytics/pages', [
                WebsiteAnalyticsController::class,
                'pages'
            ]);

            Route::get('/website-analytics/visitors', [
                WebsiteAnalyticsController::class,
                'visitors'
            ]);

            Route::get('/admins', [
                AdminManagementController::class,
                'index'
            ]);

            Route::post('/admins', [
                AdminManagementController::class,
                'store'
            ]);

            Route::put('/admins/{user}', [
                AdminManagementController::class,
                'update'
            ]);

            Route::put('/admins/{user}/toggle-status', [
                AdminManagementController::class,
                'toggleStatus'
            ]);
        });


    /*
    |--------------------------------------------------------------------------
    | User / Settings
    |--------------------------------------------------------------------------
    */

    Route::get('/settings', [
        UserProfileController::class,
        'show'
    ]);

    Route::put('/settings/profile', [
        UserProfileController::class,
        'updateProfile'
    ]);

    Route::put('/settings/password', [
        UserProfileController::class,
        'updatePassword'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Batches
    |--------------------------------------------------------------------------
    */

    Route::get('/batches', [
        BatchController::class,
        'index'
    ]);

    Route::post('/batches', [
        BatchController::class,
        'store'
    ]);

    Route::put('/batches/{batch}', [
        BatchController::class,
        'update'
    ]);

    Route::delete('/batches/{batch}', [
        BatchController::class,
        'destroy'
    ]);
    Route::post('/batches/{batch}/release', [BatchController::class, 'release']);

    /*
    |--------------------------------------------------------------------------
    | Farm Management
    |--------------------------------------------------------------------------
    */

    Route::get('/farm-management', [
        FarmManagementController::class,
        'index'
    ]);


    /*
    |--------------------------------------------------------------------------
    | System Settings
    |--------------------------------------------------------------------------
    */

    Route::get('/system-settings', [
        SystemSettingController::class,
        'index'
    ]);

    Route::put('/system-settings/delivery', [
        SystemSettingController::class,
        'updateDelivery'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Crayfish Types
    |--------------------------------------------------------------------------
    */

    Route::post('/crayfish-types', [
        FarmManagementController::class,
        'storeCrayfishType'
    ]);

    Route::put('/crayfish-types/{id}', [
        FarmManagementController::class,
        'updateCrayfishType'
    ]);

    Route::delete('/crayfish-types/{id}', [
        FarmManagementController::class,
        'deleteCrayfishType'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Area Types
    |--------------------------------------------------------------------------
    */

    Route::post('/area-types', [
        FarmManagementController::class,
        'storeAreaType'
    ]);

    Route::put('/area-types/{id}', [
        FarmManagementController::class,
        'updateAreaType'
    ]);

    Route::delete('/area-types/{id}', [
        FarmManagementController::class,
        'deleteAreaType'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Delivery Addresses
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/delivery-addresses',
        [
            DeliveryAddressController::class,
            'index'
        ]
    );

    Route::post(
        '/delivery-addresses',
        [
            DeliveryAddressController::class,
            'store'
        ]
    );

    Route::put(
        '/delivery-addresses/{deliveryAddress}',
        [
            DeliveryAddressController::class,
            'update'
        ]
    );

    Route::put(
        '/delivery-addresses/{deliveryAddress}/default',
        [
            DeliveryAddressController::class,
            'setDefault'
        ]
    );

    Route::delete(
        '/delivery-addresses/{deliveryAddress}',
        [
            DeliveryAddressController::class,
            'destroy'
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | Farm Areas
    |--------------------------------------------------------------------------
    */

    Route::post('/areas', [
        FarmManagementController::class,
        'storeArea'
    ]);

    Route::put('/areas/{id}', [
        FarmManagementController::class,
        'updateArea'
    ]);

    Route::delete('/areas/{id}', [
        FarmManagementController::class,
        'deleteArea'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Products - Protected Write Operations
    |--------------------------------------------------------------------------
    |
    | GET /products is public and is defined above.
    | Creating, editing, and deleting products remain protected.
    |
    */

    Route::post('/products', [
        ProductController::class,
        'store'
    ]);

    Route::put('/products/{product}', [
        ProductController::class,
        'update'
    ]);

    Route::delete('/products/{product}', [
        ProductController::class,
        'destroy'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Delivery Areas - Protected Write Operations
    |--------------------------------------------------------------------------
    |
    | GET /delivery-areas is public and is defined above.
    | Creating, editing, and deleting delivery areas remain protected.
    |
    */

    Route::post('/delivery-areas', [
        DeliveryAreaController::class,
        'store'
    ]);

    Route::put('/delivery-areas/{deliveryArea}', [
        DeliveryAreaController::class,
        'update'
    ]);

    Route::delete('/delivery-areas/{deliveryArea}', [
        DeliveryAreaController::class,
        'destroy'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Orders
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | Get Orders
    |--------------------------------------------------------------------------
    */

    Route::get('/orders', [
        OrderController::class,
        'index'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Show Single Order
    |--------------------------------------------------------------------------
    */

    Route::get('/orders/{order}', [
        OrderController::class,
        'show'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Normal / COD Order
    |--------------------------------------------------------------------------
    */

    Route::post('/orders', [
        OrderController::class,
        'store'
    ]);


    /*
    |--------------------------------------------------------------------------
    | PayMongo Order
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | This points to OrderController::paymongo()
    |
    */

    Route::post('/orders/paymongo', [
        OrderController::class,
        'paymongo'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Update Order
    |--------------------------------------------------------------------------
    */

    Route::put('/orders/{order}', [
        OrderController::class,
        'update'
    ]);


    /*
    |--------------------------------------------------------------------------
    | Cancel Order
    |--------------------------------------------------------------------------
    */

    Route::post('/orders/{order}/cancel', [
        OrderController::class,
        'cancel'
    ]);


    /*
    |--------------------------------------------------------------------------
    | ADMIN - ASSIGN DELIVERY PERSONNEL
    |--------------------------------------------------------------------------
    |
    | Admin selects which delivery personnel will
    | deliver a specific customer order.
    |
    */

    Route::middleware('role:admin')->group(function () {

        Route::put(
            '/orders/{order}/assign-delivery',
            [
                OrderController::class,
                'assignDelivery'
            ]
        );

        Route::put(
            '/orders/{order}/cancellation-review',
            [
                OrderController::class,
                'reviewCancellation'
            ]
        );

        Route::post(
            '/orders/{order}/refund-retry',
            [
                OrderController::class,
                'retryRefund'
            ]
        );
    });


    /*
    |--------------------------------------------------------------------------
    | DELIVERY PERSONNEL
    |--------------------------------------------------------------------------
    |
    | These routes are ONLY accessible by users
    | whose role is "delivery".
    |
    */

    Route::middleware('role:delivery')->group(function () {

        /*
        |--------------------------------------------------------------------------
        | Get assigned delivery orders
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/delivery/orders',
            [
                OrderController::class,
                'deliveryOrders'
            ]
        );


        /*
        |--------------------------------------------------------------------------
        | Update delivery status
        |--------------------------------------------------------------------------
        */

        Route::put(
            '/delivery/orders/{order}/status',
            [
                OrderController::class,
                'updateDeliveryStatus'
            ]
        );
    });


    /*
    |--------------------------------------------------------------------------
    | Delivery Personnel Management
    |--------------------------------------------------------------------------
    |
    | ADMIN ONLY
    |
    | Admin can:
    |
    | - View delivery personnel
    | - Create delivery account
    | - Update delivery account
    | - Enable / disable account
    | - Delete delivery account
    |
    */

    Route::middleware('role:admin')->group(function () {

        Route::get('/delivery-personnel', [
            DeliveryPersonnelController::class,
            'index'
        ]);

        Route::post('/delivery-personnel', [
            DeliveryPersonnelController::class,
            'store'
        ]);

        Route::put('/delivery-personnel/{user}', [
            DeliveryPersonnelController::class,
            'update'
        ]);

        Route::put(
            '/delivery-personnel/{user}/toggle-status',
            [
                DeliveryPersonnelController::class,
                'toggleStatus'
            ]
        );

        Route::delete('/delivery-personnel/{user}', [
            DeliveryPersonnelController::class,
            'destroy'
        ]);
    });
});
