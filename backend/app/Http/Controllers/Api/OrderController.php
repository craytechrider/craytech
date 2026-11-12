<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\DeliveryAddress;
use App\Models\User;
use App\Notifications\CraytechNotification;
use App\Services\FirebasePushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class OrderController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | GET ORDERS
    |--------------------------------------------------------------------------
    |
    | ADMIN:
    |   Can see all orders.
    |
    | CUSTOMER:
    |   Can only see their own orders.
    |
    | DELIVERY:
    |   Can only see orders assigned to their account.
    |
    */

    public function index(Request $request)
    {
        try {

            $user = $request->user();

            /*
            |--------------------------------------------------------------------------
            | ADMIN
            |--------------------------------------------------------------------------
            */

            if ($user->role === 'admin') {

                $orders = Order::with([
                    'items.product',
                    'user',
                    'deliveryAddress',
                    'deliveryPersonnel',
                ])
                    ->latest()
                    ->get();
            }

            /*
            |--------------------------------------------------------------------------
            | DELIVERY PERSONNEL
            |--------------------------------------------------------------------------
            */ elseif ($user->role === 'delivery') {

                $orders = Order::with([
                    'items.product',
                    'user',
                    'deliveryAddress',
                    'deliveryPersonnel',
                ])
                    ->where(
                        'delivery_personnel_id',
                        $user->id
                    )
                    ->where(
                        'delivery_method',
                        'delivery'
                    )
                    ->whereNotIn(
                        'delivery_status',
                        [
                            'delivered',
                        ]
                    )
                    ->latest()
                    ->get();
            }

            /*
            |--------------------------------------------------------------------------
            | CUSTOMER
            |--------------------------------------------------------------------------
            */ else {

                $orders = Order::with([
                    'items.product',
                    'user',
                    'deliveryAddress',
                    'deliveryPersonnel',
                ])
                    ->where(
                        'user_id',
                        $user->id
                    )
                    ->latest()
                    ->get();
            }

            return response()->json([
                'success' => true,
                'data' => $orders,
            ]);
        } catch (\Throwable $e) {

            return response()->json([
                'success' => false,
                'message' => 'Failed to load orders.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | SHOW ORDER
    |--------------------------------------------------------------------------
    */

    public function show(
        Request $request,
        Order $order
    ) {
        try {

            $user = $request->user();

            /*
            |--------------------------------------------------------------------------
            | ADMIN
            |--------------------------------------------------------------------------
            */

            if ($user->role === 'admin') {
                // Admin can view any order.
            }

            /*
            |--------------------------------------------------------------------------
            | DELIVERY PERSONNEL
            |--------------------------------------------------------------------------
            */ elseif ($user->role === 'delivery') {

                if (
                    (int) $order->delivery_personnel_id
                    !==
                    (int) $user->id
                ) {

                    return response()->json([
                        'success' => false,
                        'message' => 'This order is not assigned to you.',
                    ], 403);
                }
            }

            /*
            |--------------------------------------------------------------------------
            | CUSTOMER
            |--------------------------------------------------------------------------
            */ else {

                if (
                    (int) $order->user_id
                    !==
                    (int) $user->id
                ) {

                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized.',
                    ], 403);
                }
            }

            /*
            |--------------------------------------------------------------------------
            | LOAD RELATIONSHIPS
            |--------------------------------------------------------------------------
            */

            $order->load([
                'items.product',
                'user',
                'deliveryAddress',
                'deliveryPersonnel',
            ]);

            return response()->json([
                'success' => true,
                'data' => $order,
            ]);
        } catch (\Throwable $e) {

            return response()->json([
                'success' => false,
                'message' => 'Failed to load order.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE COD / NORMAL ORDER
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        return $this->createOrder(
            $request,
            false
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE PAYMONGO ORDER
    |--------------------------------------------------------------------------
    */

    public function paymongo(Request $request)
    {
        return $this->createOrder(
            $request,
            true
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE ORDER
    |--------------------------------------------------------------------------
    */

    private function createOrder(
        Request $request,
        bool $usePayMongo
    ) {

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([

            'customer_name' => [
                'required',
                'string',
                'max:191',
            ],

            'customer_contact' => [
                'required',
                'string',
                'max:191',
            ],

            'delivery_method' => [
                'required',
                'in:pickup,delivery',
            ],

            'payment_method' => [
                'required',
                'in:cod,paymongo,pay_at_counter',
            ],

            'delivery_address_id' => [
                'nullable',
                'integer',
                'exists:delivery_addresses,id',
            ],

            'customer_note' => [
                'nullable',
                'string',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
            ],

            'items.*.product_id' => [
                'required',
                'integer',
                'exists:products,id',
            ],

            'items.*.quantity' => [
                'required',
                'numeric',
                'gt:0',
            ],
        ]);


        /*
        |--------------------------------------------------------------------------
        | LOGGED-IN USER
        |--------------------------------------------------------------------------
        */

        $user = $request->user();


        /*
        |--------------------------------------------------------------------------
        | PAYMENT / DELIVERY VALIDATION
        |--------------------------------------------------------------------------
        |
        | Pickup orders are paid at the counter.
        | Delivery orders may use COD or PayMongo.
        |
        */

        if (
            $validated['delivery_method'] === 'pickup'
            && $validated['payment_method'] !== 'pay_at_counter'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Pickup orders must use Pay at Counter.',
            ], 422);
        }

        if (
            $validated['delivery_method'] === 'delivery'
            && $validated['payment_method'] === 'pay_at_counter'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Pay at Counter is only available for pickup orders.',
            ], 422);
        }

        if (
            $usePayMongo
            && $validated['payment_method'] !== 'paymongo'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'This endpoint requires PayMongo payment.',
            ], 422);
        }

        if (
            !$usePayMongo
            && $validated['payment_method'] === 'paymongo'
        ) {
            return response()->json([
                'success' => false,
                'message' => 'PayMongo orders must use the PayMongo checkout endpoint.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | DELIVERY ADDRESS VALIDATION
        |--------------------------------------------------------------------------
        */

        if (
            $validated['delivery_method'] === 'delivery'
            &&
            empty($validated['delivery_address_id'])
        ) {

            return response()->json([
                'success' => false,
                'message' =>
                'Please select a delivery address.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | PICKUP
        |--------------------------------------------------------------------------
        |
        | Pickup does not need a delivery address.
        |
        */

        if (
            $validated['delivery_method'] === 'pickup'
        ) {

            $validated['delivery_address_id'] = null;
        }


        /*
        |--------------------------------------------------------------------------
        | VERIFY DELIVERY ADDRESS
        |--------------------------------------------------------------------------
        |
        | The address must belong to the currently
        | logged-in customer.
        |
        */

        $deliveryAddress = null;

        if (
            $validated['delivery_method'] === 'delivery'
        ) {

            $deliveryAddress = DeliveryAddress::where(
                'id',
                $validated['delivery_address_id']
            )
                ->where(
                    'user_id',
                    $user->id
                )
                ->first();

            if (!$deliveryAddress) {

                return response()->json([
                    'success' => false,
                    'message' =>
                    'The selected delivery address does not belong to your account.',
                ], 422);
            }
        }


        /*
        |--------------------------------------------------------------------------
        | DATABASE TRANSACTION
        |--------------------------------------------------------------------------
        */

        DB::beginTransaction();

        try {

            /*
            |--------------------------------------------------------------------------
            | GENERATE ORDER NUMBER
            |--------------------------------------------------------------------------
            */

            do {

                $orderNumber =
                    'CRY-' .
                    now()->format('YmdHisv') .
                    '-' .
                    strtoupper(
                        Str::random(8)
                    );
            } while (
                Order::where(
                    'order_number',
                    $orderNumber
                )->exists()
            );


            /*
            |--------------------------------------------------------------------------
            | CALCULATE TOTAL
            |--------------------------------------------------------------------------
            */

            $totalAmount = 0;

            $preparedItems = [];


            foreach (
                $validated['items']
                as $item
            ) {

                /*
                |--------------------------------------------------------------------------
                | LOCK PRODUCT ROW
                |--------------------------------------------------------------------------
                */

                $product = Product::where(
                    'id',
                    $item['product_id']
                )
                    ->lockForUpdate()
                    ->first();


                if (!$product) {

                    throw new \Exception(
                        'Product not found.'
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | QUANTITY
                |--------------------------------------------------------------------------
                |
                | Quantity is kilograms.
                |
                */

                $quantity =
                    (float) $item['quantity'];


                if ($quantity <= 0) {

                    throw new \Exception(
                        "Invalid quantity for {$product->name}."
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | AVAILABLE KILOGRAMS
                |--------------------------------------------------------------------------
                */

                $availableWeight =
                    (float)
                    $product->available_weight_kg;


                if (
                    $quantity >
                    $availableWeight
                ) {

                    throw new \Exception(
                        "Not enough stock for {$product->name}. " .
                            "Only {$availableWeight} kg available."
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | PRICE PER KG
                |--------------------------------------------------------------------------
                */

                $unitPrice =
                    (float)
                    $product->price_per_kg;


                /*
                |--------------------------------------------------------------------------
                | SUBTOTAL
                |--------------------------------------------------------------------------
                */

                $subtotal =
                    $quantity *
                    $unitPrice;


                $totalAmount +=
                    $subtotal;


                $preparedItems[] = [

                    'product' =>
                    $product,

                    'quantity' =>
                    $quantity,

                    'unit_price' =>
                    $unitPrice,

                    'subtotal' =>
                    $subtotal,
                ];
            }


            /*
            |--------------------------------------------------------------------------
            | CREATE ORDER
            |--------------------------------------------------------------------------
            */

            $order = Order::create([

                'user_id' =>
                $user->id,

                'order_number' =>
                $orderNumber,

                'customer_name' =>
                $validated['customer_name'],

                'customer_contact' =>
                $validated['customer_contact'],

                'order_type' =>
                'online',

                'status' =>
                'pending',

                /*
                |--------------------------------------------------------------------------
                | DELIVERY
                |--------------------------------------------------------------------------
                */

                'delivery_method' =>
                $validated['delivery_method'],

                'delivery_address_id' =>
                $validated['delivery_address_id'],

                /*
                |--------------------------------------------------------------------------
                | DELIVERY ASSIGNMENT
                |--------------------------------------------------------------------------
                |
                | No delivery personnel is assigned
                | when the customer first creates
                | the order.
                |
                */

                'delivery_personnel_id' =>
                null,

                'delivery_status' =>
                $validated['delivery_method'] === 'delivery'
                    ? 'pending'
                    : null,

                'assigned_at' =>
                null,

                'delivered_at' =>
                null,

                'customer_note' =>
                $validated['customer_note'] ?? null,

                /*
                |--------------------------------------------------------------------------
                | PAYMENT
                |--------------------------------------------------------------------------
                */

                'payment_method' =>
                $validated['payment_method'],

                'payment_status' =>
                'pending',

                /*
                |--------------------------------------------------------------------------
                | TOTAL
                |--------------------------------------------------------------------------
                */

                'total_amount' =>
                round(
                    $totalAmount,
                    2
                ),
            ]);


            /*
            |--------------------------------------------------------------------------
            | CREATE ORDER ITEMS
            |--------------------------------------------------------------------------
            */

            foreach (
                $preparedItems
                as $prepared
            ) {

                $order->items()->create([

                    'product_id' =>
                    $prepared['product']->id,

                    /*
                    |--------------------------------------------------------------------------
                    | SELLING TYPE
                    |--------------------------------------------------------------------------
                    */

                    'selling_type' =>
                    'kilogram',

                    /*
                    |--------------------------------------------------------------------------
                    | QUANTITY
                    |--------------------------------------------------------------------------
                    */

                    'quantity' =>
                    $prepared['quantity'],

                    /*
                    |--------------------------------------------------------------------------
                    | PRICE
                    |--------------------------------------------------------------------------
                    */

                    'unit_price' =>
                    $prepared['unit_price'],

                    /*
                    |--------------------------------------------------------------------------
                    | SUBTOTAL
                    |--------------------------------------------------------------------------
                    */

                    'subtotal' =>
                    $prepared['subtotal'],
                ]);
            }


            /*
            |--------------------------------------------------------------------------
            | PAYMONGO
            |--------------------------------------------------------------------------
            */

            if ($usePayMongo) {

                $checkoutResponse =
                    $this->createPayMongoCheckout(
                        $order,
                        $preparedItems
                    );


                /*
                |--------------------------------------------------------------------------
                | SAVE CHECKOUT SESSION ID
                |--------------------------------------------------------------------------
                */

                $order->update([

                    'paymongo_checkout_id' =>
                    $checkoutResponse['id'],
                ]);


                DB::commit();

                // Notify after the order and checkout session are committed.
                $this->notifyOrderCreated($order, $user);

                return response()->json([

                    'success' =>
                    true,

                    'message' =>
                    'Order created. Redirecting to PayMongo.',

                    'data' => [

                        'order' =>
                        $order->load([
                            'items.product',
                            'deliveryAddress',
                            'deliveryPersonnel',
                        ]),

                        'checkout_url' =>
                        $checkoutResponse['checkout_url'],

                        'checkout_id' =>
                        $checkoutResponse['id'],
                    ],

                ], 201);
            }


            /*
            |--------------------------------------------------------------------------
            | NORMAL / PAY AT COUNTER ORDER
            |--------------------------------------------------------------------------
            */

            DB::commit();

            // Notify after the order is committed.
            $this->notifyOrderCreated($order, $user);

            return response()->json([

                'success' =>
                true,

                'message' =>
                'Order created successfully.',

                'data' =>
                $order->load([
                    'items.product',
                    'deliveryAddress',
                    'deliveryPersonnel',
                ]),

            ], 201);
        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([

                'success' =>
                false,

                'message' =>
                'Failed to create order.',

                'error' =>
                $e->getMessage(),

            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | PAYMONGO CHECKOUT SESSION
    |--------------------------------------------------------------------------
    */

    private function createPayMongoCheckout(
        Order $order,
        array $preparedItems
    ): array {

        $lineItems = [];


        foreach (
            $preparedItems
            as $prepared
        ) {

            $product =
                $prepared['product'];

            $quantity =
                $prepared['quantity'];

            $unitPrice =
                (float) $prepared['unit_price'];

            $subtotal =
                (float) $prepared['subtotal'];


            /*
            |--------------------------------------------------------------------------
            | PAYMONGO AMOUNT
            |--------------------------------------------------------------------------
            |
            | PayMongo uses centavos.
            | The subtotal already contains: quantity × price per kg.
            |
            */

            $amountInCentavos =
                (int) round(
                    $subtotal * 100
                );


            $lineItems[] = [

                'name' =>
                $product->name .
                    ' (' .
                    $quantity .
                    ' kg)',

                'amount' =>
                $amountInCentavos,

                'currency' =>
                'PHP',

                /*
                |--------------------------------------------------------------------------
                | PayMongo quantity must be integer.
                |--------------------------------------------------------------------------
                */

                'quantity' =>
                1,

                'description' =>
                'Crayfish - ' .
                    number_format(
                        $quantity,
                        2
                    ) .
                    ' kg at ₱' .
                    number_format(
                        $unitPrice,
                        2
                    ) .
                    '/kg',
            ];
        }


        /*
        |--------------------------------------------------------------------------
        | PAYMONGO SECRET KEY
        |--------------------------------------------------------------------------
        */

        $secretKey = config('services.paymongo.secret_key');


        if (!$secretKey) {

            throw new \Exception(
                'PAYMONGO_SECRET_KEY is not configured.'
            );
        }


        /*
        |--------------------------------------------------------------------------
        | FRONTEND URL
        |--------------------------------------------------------------------------
        */

        $frontendUrl =
            rtrim(
                env(
                    'FRONTEND_URL',
                    'http://localhost:5173'
                ),
                '/'
            );


        /*
        |--------------------------------------------------------------------------
        | CREATE CHECKOUT SESSION
        |--------------------------------------------------------------------------
        */

        $response =
            Http::withBasicAuth(
                $secretKey,
                ''
            )
            ->acceptJson()
            ->asJson()
            /*
            |--------------------------------------------------------------
            | PAYMONGO CONNECTION STABILITY
            |--------------------------------------------------------------
            |
            | PayMongo can occasionally take longer to resolve/connect.
            | The previous request was failing after ~10 seconds with:
            |
            |   cURL error 28: Resolving timed out after 10006 ms
            |
            | Give DNS/connection establishment up to 20 seconds and the
            | complete request up to 45 seconds. Retry only connection
            | exceptions so normal PayMongo/API errors are not retried.
            |
            */
            ->connectTimeout(20)
            ->timeout(45)
            ->retry(2, 1500, function ($exception) {
                return $exception instanceof \Illuminate\Http\Client\ConnectionException;
            })
            ->post(
                'https://api.paymongo.com/v2/checkout_sessions',
                [

                    'data' => [

                        'attributes' => [

                            'line_items' =>
                            $lineItems,

                            /*
                                |--------------------------------------------------------------------------
                                | PAYMENT METHODS
                                |--------------------------------------------------------------------------
                                */

                            'payment_method_types' => [
                                'qrph',
                            ],

                            /*
                                |--------------------------------------------------------------------------
                                | DESCRIPTION
                                |--------------------------------------------------------------------------
                                */

                            'description' =>
                            'CRAYTECH Order ' .
                                $order->order_number,

                            /*
                                |--------------------------------------------------------------------------
                                | REFERENCE NUMBER
                                |--------------------------------------------------------------------------
                                */

                            'reference_number' =>
                            $order->order_number,

                            /*
                                |--------------------------------------------------------------------------
                                | METADATA
                                |--------------------------------------------------------------------------
                                */

                            'metadata' => [

                                'order_id' =>
                                (string)
                                $order->id,

                                'order_number' =>
                                $order->order_number,

                                'delivery_address_id' =>
                                $order->delivery_address_id
                                    ? (string)
                                    $order->delivery_address_id
                                    : null,
                            ],

                            /*
                                |--------------------------------------------------------------------------
                                | DISPLAY OPTIONS
                                |--------------------------------------------------------------------------
                                */

                            'show_description' =>
                            true,

                            'show_line_items' =>
                            true,

                            'send_email_receipt' =>
                            false,

                            /*
                                |--------------------------------------------------------------------------
                                | SUCCESS URL
                                |--------------------------------------------------------------------------
                                */

                            'success_url' =>
                            $frontendUrl .
                                '/customer/payment-success' .
                                '?order=' .
                                urlencode(
                                    $order->order_number
                                ),

                            /*
                                |--------------------------------------------------------------------------
                                | CANCEL URL
                                |--------------------------------------------------------------------------
                                */

                            'cancel_url' =>
                            $frontendUrl .
                                '/customer/checkout' .
                                '?payment=cancelled',
                        ],
                    ],
                ]
            );


        /*
        |--------------------------------------------------------------------------
        | PAYMONGO ERROR
        |--------------------------------------------------------------------------
        */

        if (!$response->successful()) {

            throw new \Exception(
                'PayMongo error: ' .
                    $response->body()
            );
        }


        $json =
            $response->json();


        $checkoutData =
            $json['data'] ?? null;


        $checkoutId =
            $checkoutData['id'] ?? null;


        $attributes =
            $checkoutData['attributes'] ?? [];


        $checkoutUrl =
            $attributes['checkout_url'] ?? null;


        if (
            !$checkoutId ||
            !$checkoutUrl
        ) {

            throw new \Exception(
                'PayMongo did not return a checkout URL.'
            );
        }


        return [

            'id' =>
            $checkoutId,

            'checkout_url' =>
            $checkoutUrl,
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | ASSIGN DELIVERY PERSONNEL
    |--------------------------------------------------------------------------
    |
    | ADMIN ONLY
    |
    */

    public function assignDelivery(
        Request $request,
        Order $order
    ) {

        /*
        |--------------------------------------------------------------------------
        | ADMIN CHECK
        |--------------------------------------------------------------------------
        */

        if ($request->user()->role !== 'admin') {

            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }


        /*
        |--------------------------------------------------------------------------
        | DELIVERY ORDER CHECK
        |--------------------------------------------------------------------------
        */

        if ($order->delivery_method !== 'delivery') {

            return response()->json([
                'success' => false,
                'message' =>
                'This order is not a delivery order.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        |
        | The packed piece count is recorded per order item because each
        | product can belong to a different batch.
        |
        */

        $validated = $request->validate([

            'delivery_personnel_id' => [
                'required',
                'integer',
                'exists:users,id',
            ],

            'items' => [
                'nullable',
                'array',
            ],

            'items.*.order_item_id' => [
                'required_with:items',
                'integer',
                'exists:order_items,id',
            ],

            'items.*.packed_pieces' => [
                'required_with:items',
                'integer',
                'min:1',
            ],

        ]);


        /*
        |--------------------------------------------------------------------------
        | FIND ACTIVE DELIVERY PERSON
        |--------------------------------------------------------------------------
        */

        $deliveryPersonnel = User::where(
            'id',
            $validated['delivery_personnel_id']
        )
            ->where(
                'role',
                'delivery'
            )
            ->where(
                'is_active',
                true
            )
            ->first();


        if (!$deliveryPersonnel) {

            return response()->json([
                'success' => false,
                'message' =>
                'The selected delivery personnel is not active.',
            ], 422);
        }


        /*
        |--------------------------------------------------------------------------
        | INVENTORY + ASSIGNMENT TRANSACTION
        |--------------------------------------------------------------------------
        */

        try {

            DB::beginTransaction();

            $lockedOrder = Order::where(
                'id',
                $order->id
            )
                ->lockForUpdate()
                ->firstOrFail();

            $orderItems = $lockedOrder->items()
                ->get();

            if ($orderItems->isEmpty()) {
                throw new \Exception(
                    'This order has no items to prepare.'
                );
            }


            /*
            |--------------------------------------------------------------------------
            | CHECK WHETHER INVENTORY WAS ALREADY RECORDED
            |--------------------------------------------------------------------------
            */

            $inventoryAlreadyRecorded =
                $orderItems->every(
                    fn($item) =>
                    $item->packed_pieces !== null
                );


            /*
            |--------------------------------------------------------------------------
            | INVENTORY DEDUCTION
            |--------------------------------------------------------------------------
            |
            | Only deduct once. If the order is being reassigned to another
            | rider after preparation, inventory is not deducted again.
            |
            */

            if (!$inventoryAlreadyRecorded) {

                $submittedItems =
                    collect($validated['items'] ?? [])
                    ->keyBy('order_item_id');

                foreach ($orderItems as $orderItem) {

                    if (
                        $orderItem->packed_pieces !== null
                    ) {
                        throw new \Exception(
                            'Inventory preparation is incomplete. Please contact the administrator.'
                        );
                    }

                    $prepared =
                        $submittedItems->get($orderItem->id);

                    if (!$prepared) {
                        throw new \Exception(
                            "Please enter the packed piece count for all order items."
                        );
                    }

                    $packedPieces =
                        (int) $prepared['packed_pieces'];

                    if ($packedPieces <= 0) {
                        throw new \Exception(
                            "Packed pieces for {$orderItem->id} must be greater than zero."
                        );
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | LOCK PRODUCT
                    |--------------------------------------------------------------------------
                    */

                    $product = Product::where(
                        'id',
                        $orderItem->product_id
                    )
                        ->lockForUpdate()
                        ->first();

                    if (!$product) {
                        throw new \Exception(
                            "Product for order item {$orderItem->id} was not found."
                        );
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | LOCK LINKED BATCH
                    |--------------------------------------------------------------------------
                    */

                    if (!$product->batch_id) {
                        throw new \Exception(
                            "Product {$product->name} is not linked to a batch."
                        );
                    }

                    $batch = DB::table('batches')
                        ->where(
                            'id',
                            $product->batch_id
                        )
                        ->lockForUpdate()
                        ->first();

                    if (!$batch) {
                        throw new \Exception(
                            "The batch linked to {$product->name} was not found."
                        );
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | CHECK BATCH POPULATION
                    |--------------------------------------------------------------------------
                    */

                    $currentPopulation =
                        (int) $batch->current_population;

                    if ($packedPieces > $currentPopulation) {
                        throw new \Exception(
                            "Not enough crayfish in {$batch->batch_name}. " .
                                "Only {$currentPopulation} pieces remain in the batch."
                        );
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | CHECK PRODUCT KILOGRAM STOCK
                    |--------------------------------------------------------------------------
                    */

                    $orderedWeight =
                        (float) $orderItem->quantity;

                    if (
                        $orderItem->selling_type === 'kilogram'
                    ) {

                        $availableWeight =
                            (float) $product->available_weight_kg;

                        if ($orderedWeight > $availableWeight) {
                            throw new \Exception(
                                "Not enough {$product->name} weight stock. " .
                                    "Only " .
                                    number_format(
                                        $availableWeight,
                                        2
                                    ) .
                                    " kg remain."
                            );
                        }

                        $newAvailableWeight =
                            max(
                                0,
                                $availableWeight - $orderedWeight
                            );

                        $product->available_weight_kg =
                            $newAvailableWeight;

                        $product->is_available =
                            $newAvailableWeight > 0;

                        $product->save();
                    }


                    /*
                    |--------------------------------------------------------------------------
                    | DEDUCT BATCH PIECES
                    |--------------------------------------------------------------------------
                    */

                    DB::table('batches')
                        ->where(
                            'id',
                            $batch->id
                        )
                        ->update([
                            'current_population' =>
                            $currentPopulation - $packedPieces,

                            'updated_at' =>
                            now(),
                        ]);


                    /*
                    |--------------------------------------------------------------------------
                    | SAVE PACKED PIECES
                    |--------------------------------------------------------------------------
                    */

                    DB::table('order_items')
                        ->where(
                            'id',
                            $orderItem->id
                        )
                        ->update([
                            'packed_pieces' =>
                            $packedPieces,

                            'updated_at' =>
                            now(),
                        ]);
                }
            }


            /*
            |--------------------------------------------------------------------------
            | ASSIGN DELIVERY PERSONNEL
            |--------------------------------------------------------------------------
            */

            $lockedOrder->update([

                'delivery_personnel_id' =>
                $deliveryPersonnel->id,

                'delivery_status' =>
                'assigned',

                'assigned_at' =>
                now(),

                'delivered_at' =>
                null,
            ]);

            DB::commit();

            $orderNumber = $lockedOrder->order_number;

            $this->sendCraytechNotification(
                $deliveryPersonnel,
                'New delivery assignment',
                "You have been assigned order {$orderNumber}.",
                'delivery_assigned',
                $lockedOrder
            );

            $customer = User::find($lockedOrder->user_id);

            $this->sendCraytechNotification(
                $customer,
                'Delivery personnel assigned',
                "A delivery person has been assigned to order {$orderNumber}.",
                'delivery_assigned',
                $lockedOrder
            );

            return response()->json([

                'success' => true,

                'message' =>
                'Inventory updated and delivery personnel assigned successfully.',

                'data' =>
                $lockedOrder->fresh([
                    'items.product',
                    'user',
                    'deliveryAddress',
                    'deliveryPersonnel',
                ]),

            ]);
        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([

                'success' => false,

                'message' =>
                'Failed to prepare order and assign delivery personnel.',

                'error' =>
                $e->getMessage(),

            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | DELIVERY PERSONNEL ORDERS
    |--------------------------------------------------------------------------
    |
    | DELIVERY ACCOUNT ONLY
    |
    */

    /*
|--------------------------------------------------------------------------
| DELIVERY PERSONNEL ORDERS
|--------------------------------------------------------------------------
|
| DELIVERY ACCOUNT ONLY
|
*/

    public function deliveryOrders(
        Request $request
    ) {
        $user = $request->user();

        /*
    |--------------------------------------------------------------------------
    | DELIVERY ROLE CHECK
    |--------------------------------------------------------------------------
    */

        if ($user->role !== 'delivery') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        try {

            /*
        |--------------------------------------------------------------------------
        | HISTORY MODE
        |--------------------------------------------------------------------------
        |
        | Normal Delivery Dashboard:
        |
        |     /delivery/orders
        |
        | Shows active deliveries only.
        |
        | Delivery History:
        |
        |     /delivery/orders?history=1
        |
        | Shows completed/delivered orders too.
        |
        */

            $isHistory = $request->boolean('history');

            /*
        |--------------------------------------------------------------------------
        | BASE QUERY
        |--------------------------------------------------------------------------
        */

            $query = Order::with([
                'items.product',
                'user',
                'deliveryAddress',
                'deliveryPersonnel',
            ])
                ->where(
                    'delivery_personnel_id',
                    $user->id
                )
                ->where(
                    'delivery_method',
                    'delivery'
                );

            /*
        |--------------------------------------------------------------------------
        | ACTIVE DELIVERY DASHBOARD
        |--------------------------------------------------------------------------
        |
        | If this is NOT history mode, hide delivered orders.
        |
        */

            if (!$isHistory) {
                $query->whereNotIn(
                    'delivery_status',
                    [
                        'delivered',
                    ]
                );
            }

            /*
        |--------------------------------------------------------------------------
        | GET ORDERS
        |--------------------------------------------------------------------------
        */

            $orders = $query
                ->latest()
                ->get();

            /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

            return response()->json([
                'success' => true,
                'data' => $orders,
            ]);
        } catch (\Throwable $e) {

            return response()->json([
                'success' => false,
                'message' =>
                'Failed to load delivery orders.',
                'error' =>
                $e->getMessage(),
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE DELIVERY STATUS
    |--------------------------------------------------------------------------
    |
    | DELIVERY PERSONNEL ONLY
    |
    */
    /*
|--------------------------------------------------------------------------
| UPDATE DELIVERY STATUS
|--------------------------------------------------------------------------
|
| DELIVERY PERSONNEL ONLY
|
*/

    public function updateDeliveryStatus(
        Request $request,
        Order $order
    ) {
        $user = $request->user();

        /*
    |--------------------------------------------------------------------------
    | DELIVERY ROLE CHECK
    |--------------------------------------------------------------------------
    */

        if ($user->role !== 'delivery') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }


        /*
    |--------------------------------------------------------------------------
    | ASSIGNMENT CHECK
    |--------------------------------------------------------------------------
    */

        if (
            (int) $order->delivery_personnel_id
            !==
            (int) $user->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'This order is not assigned to you.',
            ], 403);
        }


        /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

        $validated = $request->validate([

            'delivery_status' => [
                'required',
                'string',
                'in:assigned,out_for_delivery,delivered,failed',
            ],

            'delivery_proof_image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:10240',
            ],

        ]);


        /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

        try {

            $status = $validated['delivery_status'];

            $data = [
                'delivery_status' => $status,
            ];


            /*
        |--------------------------------------------------------------------------
        | OUT FOR DELIVERY
        |--------------------------------------------------------------------------
        */

            if ($status === 'out_for_delivery') {

                $data['status'] = 'confirmed';

                $data['delivered_at'] = null;
            }


            /*
        |--------------------------------------------------------------------------
        | DELIVERED
        |--------------------------------------------------------------------------
        */

            if ($status === 'delivered') {

                /*
            |--------------------------------------------------------------------------
            | REQUIRE PROOF PHOTO
            |--------------------------------------------------------------------------
            */

                if (!$request->hasFile('delivery_proof_image')) {

                    return response()->json([
                        'success' => false,
                        'message' => 'A proof-of-delivery photo is required.',
                    ], 422);
                }


                /*
            |--------------------------------------------------------------------------
            | STORE PROOF PHOTO
            |--------------------------------------------------------------------------
            */

                /*
                 * Save proof photos directly into the website's public storage
                 * folder. On Hostinger, the Laravel application is located in
                 * the "laravel" directory while the public website is in the
                 * sibling "public_html" directory.
                 *
                 * Keep the database value relative (delivery-proofs/filename)
                 * so the frontend can display it through:
                 * https://craytech.site/storage/{delivery_proof_image}
                 */
                $proofDirectory = dirname(base_path())
                    . DIRECTORY_SEPARATOR . 'public_html'
                    . DIRECTORY_SEPARATOR . 'storage'
                    . DIRECTORY_SEPARATOR . 'delivery-proofs';

                if (
                    !is_dir($proofDirectory)
                    && !mkdir($proofDirectory, 0755, true)
                    && !is_dir($proofDirectory)
                ) {
                    throw new \RuntimeException(
                        'Could not create the public delivery proof directory.'
                    );
                }

                if (!is_writable($proofDirectory)) {
                    throw new \RuntimeException(
                        'The public delivery proof directory is not writable.'
                    );
                }

                $proofFile = $request->file('delivery_proof_image');
                $filename = (string) Str::uuid()
                    . '.'
                    . ($proofFile->extension() ?: 'jpg');

                $proofFile->move($proofDirectory, $filename);

                // Keep the existing relative path format used by the frontend.
                $data['delivery_proof_image'] = 'delivery-proofs/' . $filename;


                /*
            |--------------------------------------------------------------------------
            | DELIVERY TIME
            |--------------------------------------------------------------------------
            */

                $data['delivered_at'] = now();


                /*
            |--------------------------------------------------------------------------
            | COMPLETE ORDER
            |--------------------------------------------------------------------------
            */

                $data['status'] = 'completed';
            }


            /*
        |--------------------------------------------------------------------------
        | NON-DELIVERED STATUS
        |--------------------------------------------------------------------------
        */

            if ($status !== 'delivered') {

                $data['delivered_at'] = null;
            }


            /*
        |--------------------------------------------------------------------------
        | SAVE ORDER
        |--------------------------------------------------------------------------
        */

            $order->update($data);


            /*
        |--------------------------------------------------------------------------
        | LOAD RELATIONSHIPS
        |--------------------------------------------------------------------------
        */

            $order->load([
                'items.product',
                'user',
                'deliveryAddress',
                'deliveryPersonnel',
            ]);


            $statusMessages = [
                'assigned' => 'Your order has been assigned to a delivery person.',
                'out_for_delivery' => 'Your order is now out for delivery.',
                'delivered' => 'Your order has been delivered successfully.',
                'failed' => 'The delivery attempt was unsuccessful. Please contact the farm.',
            ];

            $this->sendCraytechNotification(
                $order->user,
                'Delivery update',
                $statusMessages[$status] ?? "Your delivery status is now {$status}.",
                'delivery_status',
                $order
            );

            /*
        |--------------------------------------------------------------------------
        | SUCCESS RESPONSE
        |--------------------------------------------------------------------------
        */

            return response()->json([
                'success' => true,
                'message' => 'Delivery status updated successfully.',
                'data' => $order,
            ]);
        } catch (\Throwable $e) {

            /*
        |--------------------------------------------------------------------------
        | ERROR RESPONSE
        |--------------------------------------------------------------------------
        */

            return response()->json([
                'success' => false,
                'message' => 'Failed to update delivery status.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE ORDER
    |--------------------------------------------------------------------------
    |
    | ADMIN ONLY
    |
    */

    public function update(
        Request $request,
        Order $order
    ) {

        /*
        |--------------------------------------------------------------------------
        | ADMIN CHECK
        |--------------------------------------------------------------------------
        */

        if ($request->user()->role !== 'admin') {

            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }


        $validated =
            $request->validate([

                'status' => [
                    'required',
                    'string',
                    'in:pending,confirmed,completed',
                ],

            ]);


        try {

            $order->update([

                'status' =>
                $validated['status'],
            ]);

            $order->loadMissing('user');

            $this->sendCraytechNotification(
                $order->user,
                'Order status updated',
                "Your order {$order->order_number} status is now {$validated['status']}.",
                'order_status',
                $order
            );

            return response()->json([

                'success' =>
                true,

                'message' =>
                'Order updated successfully.',

                'data' =>
                $order->fresh([
                    'items.product',
                    'deliveryAddress',
                    'deliveryPersonnel',
                ]),

            ]);
        } catch (\Throwable $e) {

            return response()->json([

                'success' =>
                false,

                'message' =>
                'Failed to update order.',

                'error' =>
                $e->getMessage(),

            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CANCEL ORDER
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER CANCELLATION REQUEST
    |--------------------------------------------------------------------------
    |
    | Customers submit a reason. The order is not cancelled until an admin
    | reviews the request.
    |
    */
    public function cancel(Request $request, Order $order)
    {
        $user = $request->user();

        if ((int) $order->user_id !== (int) $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        try {
            return DB::transaction(function () use ($order, $validated) {
                $lockedOrder = Order::where('id', $order->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if (
                    $lockedOrder->status === 'completed' ||
                    $lockedOrder->status === 'cancelled' ||
                    $lockedOrder->delivery_status === 'delivered'
                ) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Completed, delivered, or cancelled orders cannot be cancelled.',
                    ], 422);
                }

                if ($lockedOrder->cancellation_status === 'pending') {
                    return response()->json([
                        'success' => false,
                        'message' => 'A cancellation request is already pending.',
                    ], 422);
                }

                if ($lockedOrder->cancellation_status === 'approved') {
                    return response()->json([
                        'success' => false,
                        'message' => 'This order has already been approved for cancellation.',
                    ], 422);
                }

                $lockedOrder->update([
                    'cancellation_status' => 'pending',
                    'cancellation_reason' => $validated['reason'],
                    'cancellation_requested_at' => now(),
                    'cancellation_reviewed_at' => null,
                    'cancellation_reviewed_by' => null,
                    'cancellation_admin_note' => null,
                ]);

                DB::afterCommit(function () use ($lockedOrder) {
                    $this->notifyAdmins(
                        'Cancellation requested',
                        "A customer requested cancellation of order {$lockedOrder->order_number}.",
                        'cancellation_requested',
                        $lockedOrder
                    );
                });

                return response()->json([
                    'success' => true,
                    'message' => 'Cancellation request submitted successfully.',
                    'data' => $lockedOrder->fresh(['items.product', 'user']),
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit cancellation request.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | ADMIN REVIEW CANCELLATION REQUEST
    |--------------------------------------------------------------------------
    |
    | Approved unpaid orders are cancelled and any prepared inventory is
    | restored exactly once. Paid orders require the separate refund workflow.
    |
    */
    public function reviewCancellation(Request $request, Order $order)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $result = DB::transaction(function () use ($request, $order, $validated) {
                $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

                if ($lockedOrder->cancellation_status !== 'pending') {
                    throw new \RuntimeException('There is no pending cancellation request for this order.');
                }
                if ($lockedOrder->status === 'completed' || $lockedOrder->status === 'cancelled' || $lockedOrder->delivery_status === 'delivered') {
                    throw new \RuntimeException('This order is no longer eligible for cancellation.');
                }

                $updates = [
                    'cancellation_status' => $validated['decision'],
                    'cancellation_reviewed_at' => now(),
                    'cancellation_reviewed_by' => $request->user()->id,
                    'cancellation_admin_note' => $validated['admin_note'] ?? null,
                ];

                if ($validated['decision'] === 'rejected') {
                    $lockedOrder->update($updates);
                    return ['paid_refund' => false, 'order' => $lockedOrder->fresh(['items.product', 'user', 'deliveryAddress', 'deliveryPersonnel'])];
                }

                if ($lockedOrder->payment_status === 'paid') {
                    if (!$lockedOrder->paymongo_payment_id) {
                        throw new \RuntimeException('PayMongo payment ID is missing. The refund cannot be initiated safely.');
                    }
                    if (in_array($lockedOrder->refund_status, ['pending', 'processing', 'succeeded'], true)) {
                        throw new \RuntimeException('A refund is already pending, processing, or completed for this order.');
                    }
                    $updates['refund_status'] = 'processing';
                    $updates['refund_amount'] = $lockedOrder->total_amount;
                    $lockedOrder->update($updates);
                    return ['paid_refund' => true, 'order' => $lockedOrder->fresh()];
                }

                if (in_array($lockedOrder->payment_status, ['refunded'], true)) {
                    throw new \RuntimeException('This order is already refunded.');
                }

                $lockedOrder->update($updates);
                $this->restoreOrderInventory($lockedOrder);
                $lockedOrder->update([
                    'status' => 'cancelled',
                    'payment_status' => 'cancelled',
                    'delivery_status' => $lockedOrder->delivery_method === 'delivery' ? 'failed' : null,
                ]);

                return ['paid_refund' => false, 'order' => $lockedOrder->fresh(['items.product', 'user', 'deliveryAddress', 'deliveryPersonnel'])];
            });

            if ($result['paid_refund']) {
                return $this->submitPayMongoRefund($result['order']->id, $request->user()->id);
            }

            $reviewedOrder = $result['order'];
            $customer = User::find($reviewedOrder->user_id);

            $decisionMessage = $validated['decision'] === 'approved'
                ? "Your cancellation request for order {$reviewedOrder->order_number} was approved."
                : "Your cancellation request for order {$reviewedOrder->order_number} was rejected.";

            $this->sendCraytechNotification(
                $customer,
                'Cancellation request update',
                $decisionMessage,
                'cancellation_review',
                $reviewedOrder
            );

            return response()->json([
                'success' => true,
                'message' => $validated['decision'] === 'approved'
                    ? 'Cancellation approved and order cancelled.'
                    : 'Cancellation request rejected.',
                'data' => $result['order'],
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Failed to review cancellation request.'], 500);
        }
    }

    /** Retry a refund only after PayMongo has explicitly returned a failed status. */
    public function retryRefund(Request $request, Order $order)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        try {
            DB::transaction(function () use ($order) {
                $locked = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();
                if ($locked->cancellation_status !== 'approved' || $locked->payment_status !== 'paid') {
                    throw new \RuntimeException('Only an approved cancellation with an unpaid refund can be retried.');
                }
                if ($locked->refund_status !== 'failed') {
                    throw new \RuntimeException('Retry is available only when the previous refund attempt has failed.');
                }
                if (!$locked->paymongo_payment_id) {
                    throw new \RuntimeException('PayMongo payment ID is missing.');
                }
                if ($locked->status === 'cancelled' || $locked->delivery_status === 'delivered') {
                    throw new \RuntimeException('This order is no longer eligible for a refund retry.');
                }
                $locked->update(['refund_status' => 'processing']);
            });

            return $this->submitPayMongoRefund($order->id, $request->user()->id);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Unable to retry refund.'], 500);
        }
    }

    /** Send a refund request to PayMongo. Network calls are deliberately outside DB transactions. */
    private function submitPayMongoRefund(int $orderId, int $adminId)
    {
        $order = Order::findOrFail($orderId);
        $secret = config('services.paymongo.secret_key');

        if (!$secret) {
            $order->update(['refund_status' => 'failed']);
            return response()->json(['success' => false, 'message' => 'PayMongo secret key is not configured. Check the server .env file.'], 500);
        }

        $amount = (int) round(((float) $order->total_amount) * 100);
        if ($amount < 100) {
            $order->update(['refund_status' => 'failed']);
            return response()->json(['success' => false, 'message' => 'Refund amount must be at least PHP 1.00.'], 422);
        }

        try {
            $response = Http::withBasicAuth($secret, '')
                ->acceptJson()
                ->asJson()
                ->connectTimeout(20)
                ->timeout(45)
                ->post('https://api.paymongo.com/v1/refunds', [
                    'data' => [
                        'attributes' => [
                            'amount' => $amount,
                            'payment_id' => $order->paymongo_payment_id,
                            'reason' => 'others',
                            'notes' => 'CRAYTECH order cancellation: ' . $order->order_number,
                        ],
                    ],
                ]);

            $body = $response->json();
            if (!$response->successful() || !isset($body['data']['id'])) {
                Log::error('PayMongo refund request failed.', [
                    'order_id' => $order->id,
                    'http_status' => $response->status(),
                    'response' => $body,
                ]);
                $order->update(['refund_status' => 'failed']);
                $message = data_get($body, 'errors.0.detail')
                    ?? data_get($body, 'errors.0.code')
                    ?? 'PayMongo could not process the refund. You may retry after checking the PayMongo dashboard.';
                return response()->json(['success' => false, 'message' => $message, 'data' => $order->fresh()], 422);
            }

            $refund = $body['data'];
            $status = data_get($refund, 'attributes.status', 'pending');
            $order->update([
                'refund_reference' => $refund['id'],
                'refund_status' => in_array($status, ['pending', 'processing', 'succeeded', 'failed'], true) ? $status : 'processing',
                'refund_amount' => $amount / 100,
            ]);

            if ($status === 'succeeded') {
                $this->finalizeSuccessfulRefund($order->id, $adminId);
            } elseif ($status === 'failed') {
                $order->update(['refund_status' => 'failed']);
            }

            $fresh = $order->fresh(['items.product', 'user', 'deliveryAddress', 'deliveryPersonnel']);
            return response()->json([
                'success' => $status !== 'failed',
                'message' => $status === 'succeeded'
                    ? 'PayMongo confirmed the refund. The order is now cancelled and inventory has been restored.'
                    : ($status === 'failed'
                        ? 'PayMongo reported that the refund failed. The order remains active; use Retry Refund after checking the error.'
                        : 'Refund request submitted to PayMongo. The order will be cancelled and inventory restored after PayMongo confirms success.'),
                'data' => $fresh,
            ], $status === 'failed' ? 422 : 200);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            // An ambiguous network outcome must not be retried automatically: PayMongo may have received it.
            $order->update(['refund_status' => 'processing']);
            Log::warning('PayMongo refund request connection outcome is unknown.', ['order_id' => $order->id]);
            return response()->json(['success' => false, 'message' => 'The connection to PayMongo timed out. The refund is kept as processing to prevent a duplicate charge. Check PayMongo before retrying.', 'data' => $order->fresh()], 202);
        } catch (\Throwable $e) {
            report($e);
            $order->update(['refund_status' => 'failed']);
            return response()->json(['success' => false, 'message' => 'Unexpected error while requesting the PayMongo refund. Check the PayMongo dashboard before retrying.'], 500);
        }
    }

    /** Called by verified PayMongo refund webhooks. */
    public function applyPayMongoRefundUpdate(array $refund): void
    {
        $paymentId = data_get($refund, 'attributes.payment_id');
        $refundId = data_get($refund, 'id');
        $status = data_get($refund, 'attributes.status');
        if (!$paymentId || !$status) {
            return;
        }

        $order = Order::where('paymongo_payment_id', $paymentId)->first();
        if (!$order) {
            Log::warning('PayMongo refund webhook did not match an order.', ['payment_id' => $paymentId, 'refund_id' => $refundId]);
            return;
        }

        if ($order->refund_status !== 'succeeded') {
            $order->update([
                'refund_reference' => $refundId ?: $order->refund_reference,
                'refund_status' => in_array($status, ['pending', 'processing', 'succeeded', 'failed'], true) ? $status : $order->refund_status,
            ]);
        }

        if ($status === 'succeeded') {
            $this->finalizeSuccessfulRefund($order->id, null);
        }
    }

    /** Finalize once only after PayMongo confirms the refund succeeded. */
    private function finalizeSuccessfulRefund(int $orderId, ?int $adminId): void
    {
        DB::transaction(function () use ($orderId, $adminId) {
            $order = Order::where('id', $orderId)->lockForUpdate()->first();
            if (!$order || $order->payment_status === 'refunded' || $order->status === 'cancelled') {
                return;
            }
            if ($order->refund_status !== 'succeeded') {
                return;
            }

            $this->restoreOrderInventory($order);
            $order->update([
                'status' => 'cancelled',
                'payment_status' => 'refunded',
                'cancellation_status' => 'approved',
                'delivery_status' => $order->delivery_method === 'delivery' ? 'failed' : null,
                'refunded_at' => now(),
                'refund_recorded_by' => $adminId,
            ]);
        });
    }

    /** Restore inventory only for order items that were actually packed/deducted. */
    private function restoreOrderInventory(Order $order): void
    {
        $orderItems = $order->items()->get();
        foreach ($orderItems as $orderItem) {
            if ($orderItem->packed_pieces === null) {
                continue;
            }
            $packedPieces = (int) $orderItem->packed_pieces;
            $product = Product::where('id', $orderItem->product_id)->lockForUpdate()->first();
            if (!$product) {
                throw new \RuntimeException("Product for order item {$orderItem->id} was not found.");
            }
            if ($orderItem->selling_type === 'kilogram') {
                $product->available_weight_kg = (float) $product->available_weight_kg + (float) $orderItem->quantity;
                $product->is_available = true;
                $product->save();
            }
            if ($product->batch_id) {
                $batch = DB::table('batches')->where('id', $product->batch_id)->lockForUpdate()->first();
                if (!$batch) {
                    throw new \RuntimeException("The batch linked to {$product->name} was not found.");
                }
                DB::table('batches')->where('id', $batch->id)->update([
                    'current_population' => (int) $batch->current_population + $packedPieces,
                    'updated_at' => now(),
                ]);
            }
            DB::table('order_items')->where('id', $orderItem->id)->update([
                'packed_pieces' => null,
                'updated_at' => now(),
            ]);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CRAYTECH NOTIFICATION HELPERS
    |--------------------------------------------------------------------------
    |
    | Database storage and FCM delivery are best-effort. Notification
    | failures must not undo an order, payment, inventory, or delivery update.
    |
    */

    private function notifyOrderCreated(Order $order, User $customer): void
    {
        $this->notifyAdmins(
            'New order received',
            "A new order {$order->order_number} has been placed.",
            'new_order',
            $order
        );

        $this->sendCraytechNotification(
            $customer,
            'Order placed successfully',
            "Your order {$order->order_number} has been received.",
            'order_placed',
            $order
        );
    }

    private function notifyAdmins(
        string $title,
        string $message,
        string $type,
        Order $order
    ): void {
        User::where('role', 'admin')
            ->chunkById(100, function ($admins) use ($title, $message, $type, $order) {
                foreach ($admins as $admin) {
                    $this->sendCraytechNotification(
                        $admin,
                        $title,
                        $message,
                        $type,
                        $order
                    );
                }
            });
    }

    private function sendCraytechNotification(
        ?User $recipient,
        string $title,
        string $message,
        string $type,
        Order $order
    ): void {
        if (!$recipient) {
            return;
        }

        $notificationData = [
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'order_id' => (string) $order->id,
            'order_number' => (string) $order->order_number,
            'action_url' => '/orders/' . $order->id,
        ];

        try {
            $recipient->notify(
                new CraytechNotification($notificationData)
            );
        } catch (Throwable $e) {
            Log::error('Could not save CRAYTECH database notification.', [
                'user_id' => $recipient->id,
                'order_id' => $order->id,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
        }

        try {
            app(FirebasePushService::class)->sendToUser(
                $recipient,
                $title,
                $message,
                $notificationData
            );
        } catch (Throwable $e) {
            Log::warning('Could not send CRAYTECH FCM push notification.', [
                'user_id' => $recipient->id,
                'order_id' => $order->id,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
