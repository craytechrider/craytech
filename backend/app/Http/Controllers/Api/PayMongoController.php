<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class PayMongoController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | WEBHOOK
    |--------------------------------------------------------------------------
    */

    public function webhook(Request $request)
    {
        /*
        |--------------------------------------------------------------------------
        | Get raw request body
        |--------------------------------------------------------------------------
        |
        | PayMongo specifically signs the raw JSON payload.
        |
        */

        $payload = $request->getContent();

        /*
        |--------------------------------------------------------------------------
        | Verify PayMongo signature
        |--------------------------------------------------------------------------
        */

        if (!$this->verifySignature($request, $payload)) {

            Log::warning(
                'Invalid PayMongo webhook signature.'
            );

            return response()->json([
                'success' => false,
                'message' => 'Invalid signature.',
            ], 400);
        }

        $body = json_decode(
            $payload,
            true
        );

        if (!is_array($body)) {

            return response()->json([
                'success' => false,
                'message' => 'Invalid JSON.',
            ], 400);
        }

        /*
        |--------------------------------------------------------------------------
        | PayMongo event
        |--------------------------------------------------------------------------
        */

        $eventData =
            $body['data'] ?? [];

        $attributes =
            $eventData['attributes'] ?? [];

        $eventType =
            $attributes['type'] ??
            $eventData['type'] ??
            null;

        Log::info(
            'PayMongo webhook received.',
            [
                'event_type' =>
                $eventType,
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | CHECKOUT SESSION PAYMENT PAID
        |--------------------------------------------------------------------------
        */

        if (
            $eventType ===
            'checkout_session.payment.paid'
        ) {

            return $this->handleCheckoutPaid(
                $attributes
            );
        }

        /*
        |--------------------------------------------------------------------------
        | PAYMENT PAID
        |--------------------------------------------------------------------------
        */

        if (
            $eventType ===
            'payment.paid'
        ) {

            return $this->handlePaymentPaid(
                $attributes
            );
        }

        /*
        |--------------------------------------------------------------------------
        | PAYMENT FAILED
        |--------------------------------------------------------------------------
        */

        if (
            $eventType ===
            'payment.failed'
        ) {

            return $this->handlePaymentFailed(
                $attributes
            );
        }

        if (in_array($eventType, ['payment.refund.updated', 'payment.refunded'], true)) {
            return $this->handleRefundUpdated($attributes, $eventType);
        }

        /*
        |--------------------------------------------------------------------------
        | Other events
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'success' => true,
            'message' =>
            'Webhook received.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | CHECKOUT PAYMENT PAID
    |--------------------------------------------------------------------------
    */

    /** Process PayMongo refund status events after signature verification. */
    private function handleRefundUpdated(array $attributes, string $eventType)
    {
        $resource = $attributes['data'] ?? null;
        if (!$resource) {
            return response()->json(['success' => true, 'message' => 'Refund event received without resource data.'], 200);
        }

        $refunds = [];
        if ($eventType === 'payment.refund.updated') {
            $refunds[] = $resource;
        } else {
            $refundCollection = data_get($resource, 'attributes.refunds.data')
                ?? data_get($resource, 'attributes.refunds', []);
            if (is_array($refundCollection)) {
                $refunds = $refundCollection;
            }
            if (empty($refunds) && data_get($resource, 'type') === 'refund') {
                $refunds[] = $resource;
            }
        }

        $orderController = app(\App\Http\Controllers\Api\OrderController::class);
        foreach ($refunds as $refund) {
            if (is_array($refund)) {
                $orderController->applyPayMongoRefundUpdate($refund);
            }
        }

        return response()->json(['success' => true, 'message' => 'Refund status processed.'], 200);
    }

    private function handleCheckoutPaid(
        array $attributes
    ) {
        /*
        | Current PayMongo webhook structure:
        |
        | data.attributes.data
        |
        */

        $session =
            $attributes['data'] ?? null;

        if (!$session) {

            return response()->json([
                'success' => true,
                'message' =>
                'Webhook received but checkout data was missing.',
            ], 200);
        }

        $sessionId =
            $session['id'] ?? null;

        $sessionAttributes =
            $session['attributes'] ?? [];

        /*
        |--------------------------------------------------------------------------
        | Find order
        |--------------------------------------------------------------------------
        */

        $referenceNumber =
            $sessionAttributes['reference_number']
            ?? null;

        $metadata =
            $sessionAttributes['metadata']
            ?? [];

        $orderId =
            $metadata['order_id']
            ?? null;

        $orderNumber =
            $metadata['order_number']
            ?? $referenceNumber;

        $order = null;

        if ($orderId) {
            $order = Order::find($orderId);
        }

        if (!$order && $orderNumber) {

            $order =
                Order::where(
                    'order_number',
                    $orderNumber
                )->first();
        }

        if (!$order && $sessionId) {

            $order =
                Order::where(
                    'paymongo_checkout_id',
                    $sessionId
                )->first();
        }

        if (!$order) {

            Log::error(
                'PayMongo webhook: order not found.',
                [
                    'checkout_id' =>
                    $sessionId,

                    'reference_number' =>
                    $referenceNumber,

                    'order_id' =>
                    $orderId,
                ]
            );

            /*
            | Return 200 so PayMongo does not endlessly retry
            | a webhook for an order that does not exist.
            */

            return response()->json([
                'success' => true,
                'message' =>
                'Order not found.',
            ], 200);
        }

        /*
        |--------------------------------------------------------------------------
        | Get payment ID
        |--------------------------------------------------------------------------
        */

        $paymentId = null;

        $payments =
            $sessionAttributes['payments']
            ?? [];

        if (
            is_array($payments) &&
            count($payments) > 0
        ) {
            $paymentId =
                $payments[0]['id']
                ?? null;
        }

        /*
        |--------------------------------------------------------------------------
        | Complete order
        |--------------------------------------------------------------------------
        */

        $this->markOrderAsPaid(
            $order,
            $sessionId,
            $paymentId
        );

        return response()->json([
            'success' => true,
            'message' =>
            'Payment confirmed.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT PAID
    |--------------------------------------------------------------------------
    */

    private function handlePaymentPaid(
        array $attributes
    ) {
        $payment =
            $attributes['data'] ?? null;

        if (!$payment) {

            return response()->json([
                'success' => true,
                'message' =>
                'Payment event received.',
            ], 200);
        }

        $paymentId =
            $payment['id'] ?? null;

        $paymentAttributes =
            $payment['attributes'] ?? [];

        $description =
            $paymentAttributes['description']
            ?? '';

        /*
        |--------------------------------------------------------------------------
        | Try to find order number from description
        |--------------------------------------------------------------------------
        */

        $order =
            Order::where(
                'paymongo_payment_id',
                $paymentId
            )->first();

        if (!$order) {

            $order =
                Order::where(
                    'order_number',
                    'like',
                    '%' . $description . '%'
                )->first();
        }

        if (!$order) {

            return response()->json([
                'success' => true,
                'message' =>
                'Payment received but order was not found.',
            ], 200);
        }

        $this->markOrderAsPaid(
            $order,
            $order->paymongo_checkout_id,
            $paymentId
        );

        return response()->json([
            'success' => true,
            'message' =>
            'Payment confirmed.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT FAILED
    |--------------------------------------------------------------------------
    */

    private function handlePaymentFailed(
        array $attributes
    ) {
        $payment =
            $attributes['data'] ?? null;

        if (!$payment) {

            return response()->json([
                'success' => true,
            ], 200);
        }

        $paymentId =
            $payment['id'] ?? null;

        $order = null;

        if ($paymentId) {

            $order =
                Order::where(
                    'paymongo_payment_id',
                    $paymentId
                )->first();
        }

        if ($order) {

            $order->update([
                'payment_status' =>
                'failed',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' =>
            'Payment failure received.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | MARK ORDER AS PAID
    |--------------------------------------------------------------------------
    */

    private function markOrderAsPaid(
        Order $order,
        ?string $checkoutId,
        ?string $paymentId
    ): void {
        DB::transaction(function () use (
            $order,
            $checkoutId,
            $paymentId
        ) {

            /*
            |--------------------------------------------------------------------------
            | Lock order
            |--------------------------------------------------------------------------
            */

            $lockedOrder =
                Order::where(
                    'id',
                    $order->id
                )
                ->lockForUpdate()
                ->first();

            if (!$lockedOrder) {
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Prevent duplicate webhook processing
            |--------------------------------------------------------------------------
            */

            if (
                $lockedOrder->payment_status ===
                'paid'
            ) {
                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Lock products and deduct KG
            |--------------------------------------------------------------------------
            */

            $items =
                $lockedOrder->items()
                ->with('product')
                ->get();

            foreach ($items as $item) {

                $product =
                    Product::where(
                        'id',
                        $item->product_id
                    )
                    ->lockForUpdate()
                    ->first();

                if (!$product) {

                    throw new \Exception(
                        "Product {$item->product_id} no longer exists."
                    );
                }

                $quantity =
                    (float) $item->quantity;

                $availableWeight =
                    (float) $product->available_weight_kg;

                /*
                |--------------------------------------------------------------------------
                | Check stock again when payment succeeds
                |--------------------------------------------------------------------------
                */

                if (
                    $quantity >
                    $availableWeight
                ) {

                    throw new \Exception(
                        "Insufficient stock for {$product->name}."
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Deduct kilograms
                |--------------------------------------------------------------------------
                */

                $newAvailableWeight =
                    $availableWeight -
                    $quantity;

                $product->available_weight_kg =
                    max(
                        0,
                        $newAvailableWeight
                    );

                /*
                |--------------------------------------------------------------------------
                | Product availability
                |--------------------------------------------------------------------------
                */

                $product->is_available =
                    $product->available_weight_kg > 0;

                $product->save();
            }

            /*
            |--------------------------------------------------------------------------
            | Update order payment
            |--------------------------------------------------------------------------
            */

            $lockedOrder->update([
                'payment_status' =>
                'paid',

                'payment_method' =>
                'paymongo',

                'paymongo_checkout_id' =>
                $checkoutId
                    ?? $lockedOrder->paymongo_checkout_id,

                'paymongo_payment_id' =>
                $paymentId
                    ?? $lockedOrder->paymongo_payment_id,

                'status' =>
                'pending',
            ]);

            Log::info(
                'CRAYTECH order marked as paid.',
                [
                    'order_id' =>
                    $lockedOrder->id,

                    'order_number' =>
                    $lockedOrder->order_number,

                    'payment_id' =>
                    $paymentId,
                ]
            );
        });
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY PAYMONGO SIGNATURE
    |--------------------------------------------------------------------------
    */

    private function verifySignature(
        Request $request,
        string $payload
    ): bool {

        $signature =
            $request->header(
                'Paymongo-Signature'
            );

        /*
        | Some environments may normalize the header.
        */

        if (!$signature) {

            $signature =
                $request->header(
                    'paymongo-signature'
                );
        }

        if (!$signature) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | Parse:
        |
        | t=timestamp,te=test_signature,li=live_signature
        |--------------------------------------------------------------------------
        */

        $parts = [];

        foreach (
            explode(
                ',',
                $signature
            ) as $part
        ) {

            $pair =
                explode(
                    '=',
                    $part,
                    2
                );

            if (count($pair) === 2) {

                $parts[$pair[0]] =
                    $pair[1];
            }
        }

        $timestamp =
            $parts['t'] ?? null;

        $testSignature =
            $parts['te'] ?? null;

        $liveSignature =
            $parts['li'] ?? null;

        if (!$timestamp) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | Webhook secret
        |--------------------------------------------------------------------------
        */

        $webhookSecret =
            env(
                'PAYMONGO_WEBHOOK_SECRET'
            );

        if (!$webhookSecret) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | Determine test/live
        |--------------------------------------------------------------------------
        */

        $body =
            json_decode(
                $payload,
                true
            );

        $eventAttributes =
            $body['data']['attributes']
            ?? [];

        $livemode =
            (bool) (
                $eventAttributes['livemode']
                ?? false
            );

        $providedSignature =
            $livemode
            ? $liveSignature
            : $testSignature;

        if (!$providedSignature) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | Signature:
        |
        | HMAC SHA256(timestamp + "." + raw JSON)
        |--------------------------------------------------------------------------
        */

        $signedPayload =
            $timestamp .
            '.' .
            $payload;

        $expectedSignature =
            hash_hmac(
                'sha256',
                $signedPayload,
                $webhookSecret
            );

        /*
        |--------------------------------------------------------------------------
        | Compare
        |--------------------------------------------------------------------------
        */

        return hash_equals(
            $expectedSignature,
            $providedSignature
        );
    }
}
