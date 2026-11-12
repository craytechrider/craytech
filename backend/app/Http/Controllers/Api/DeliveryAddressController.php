<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryAddress;
use App\Models\DeliveryArea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryAddressController extends Controller
{
    private const ALL = 'ALL';

    /**
     * Get customer's saved addresses.
     */
    public function index(Request $request)
    {
        $addresses = DeliveryAddress::where(
            'user_id',
            $request->user()->id
        )
            ->orderByDesc('is_default')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $addresses,
        ]);
    }

    /**
     * Check whether a location is allowed for delivery.
     *
     * ALL works as a wildcard at each level.
     */
    private function deliveryAreaExists(
        string $country,
        string $region,
        string $province,
        string $municipality,
        string $barangay
    ): bool {
        return DeliveryArea::query()
            ->where('country', $country)
            ->where('is_active', true)
            ->where(function ($query) use ($region) {
                $query
                    ->where('region', $region)
                    ->orWhere('region', self::ALL);
            })
            ->where(function ($query) use ($province) {
                $query
                    ->where('province', $province)
                    ->orWhere('province', self::ALL);
            })
            ->where(function ($query) use ($municipality) {
                $query
                    ->where('municipality', $municipality)
                    ->orWhere('municipality', self::ALL);
            })
            ->where(function ($query) use ($barangay) {
                $query
                    ->where('barangay', $barangay)
                    ->orWhere('barangay', self::ALL);
            })
            ->exists();
    }

    /**
     * Create new address.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'label' => [
                'required',
                'string',
                'max:100',
            ],

            'country' => [
                'required',
                'string',
                'max:100',
            ],

            'region' => [
                'required',
                'string',
                'max:150',
            ],

            'province' => [
                'required',
                'string',
                'max:150',
            ],

            'municipality' => [
                'required',
                'string',
                'max:150',
            ],

            'barangay' => [
                'required',
                'string',
                'max:150',
            ],

            'detailed_address' => [
                'required',
                'string',
                'max:1000',
            ],

            'latitude' => [
                'nullable',
                'numeric',
                'between:-90,90',
            ],

            'longitude' => [
                'nullable',
                'numeric',
                'between:-180,180',
            ],

            'is_default' => [
                'nullable',
                'boolean',
            ],
        ]);

        if (!$this->deliveryAreaExists(
            $validated['country'],
            $validated['region'],
            $validated['province'],
            $validated['municipality'],
            $validated['barangay']
        )) {
            return response()->json([
                'success' => false,
                'message' => 'This location is not currently available for delivery.',
            ], 422);
        }

        $user = $request->user();

        return DB::transaction(function () use (
            $validated,
            $user
        ) {
            $hasAddresses = DeliveryAddress::where(
                'user_id',
                $user->id
            )->exists();

            $shouldBeDefault =
                !$hasAddresses ||
                ($validated['is_default'] ?? false);

            if ($shouldBeDefault) {
                DeliveryAddress::where(
                    'user_id',
                    $user->id
                )->update([
                    'is_default' => false,
                ]);
            }

            $address = DeliveryAddress::create([
                'user_id' => $user->id,

                'label' => $validated['label'],

                'country' => $validated['country'],

                'region' => $validated['region'],

                'province' => $validated['province'],

                'municipality' => $validated['municipality'],

                'barangay' => $validated['barangay'],

                'detailed_address' =>
                $validated['detailed_address'],

                'latitude' =>
                $validated['latitude'] ?? null,

                'longitude' =>
                $validated['longitude'] ?? null,

                'is_default' =>
                $shouldBeDefault,
            ]);

            return response()->json([
                'success' => true,
                'message' =>
                'Delivery address saved successfully.',
                'data' => $address,
            ], 201);
        });
    }

    /**
     * Update address.
     */
    public function update(
        Request $request,
        DeliveryAddress $deliveryAddress
    ) {
        abort_unless(
            $deliveryAddress->user_id ===
                $request->user()->id,
            403
        );

        $validated = $request->validate([
            'label' => [
                'required',
                'string',
                'max:100',
            ],

            'country' => [
                'required',
                'string',
                'max:100',
            ],

            'region' => [
                'required',
                'string',
                'max:150',
            ],

            'province' => [
                'required',
                'string',
                'max:150',
            ],

            'municipality' => [
                'required',
                'string',
                'max:150',
            ],

            'barangay' => [
                'required',
                'string',
                'max:150',
            ],

            'detailed_address' => [
                'required',
                'string',
                'max:1000',
            ],

            'latitude' => [
                'nullable',
                'numeric',
                'between:-90,90',
            ],

            'longitude' => [
                'nullable',
                'numeric',
                'between:-180,180',
            ],

            'is_default' => [
                'nullable',
                'boolean',
            ],
        ]);

        if (!$this->deliveryAreaExists(
            $validated['country'],
            $validated['region'],
            $validated['province'],
            $validated['municipality'],
            $validated['barangay']
        )) {
            return response()->json([
                'success' => false,
                'message' =>
                'This location is not currently available for delivery.',
            ], 422);
        }

        return DB::transaction(function () use (
            $request,
            $deliveryAddress,
            $validated
        ) {
            if ($validated['is_default'] ?? false) {
                DeliveryAddress::where(
                    'user_id',
                    $request->user()->id
                )
                    ->where(
                        'id',
                        '!=',
                        $deliveryAddress->id
                    )
                    ->update([
                        'is_default' => false,
                    ]);
            }

            $deliveryAddress->update([
                'label' => $validated['label'],

                'country' => $validated['country'],

                'region' => $validated['region'],

                'province' => $validated['province'],

                'municipality' => $validated['municipality'],

                'barangay' => $validated['barangay'],

                'detailed_address' =>
                $validated['detailed_address'],

                'latitude' =>
                $validated['latitude'] ?? null,

                'longitude' =>
                $validated['longitude'] ?? null,

                'is_default' =>
                $validated['is_default'] ??
                    $deliveryAddress->is_default,
            ]);

            return response()->json([
                'success' => true,
                'message' =>
                'Delivery address updated successfully.',
                'data' =>
                $deliveryAddress->fresh(),
            ]);
        });
    }

    /**
     * Set address as default.
     */
    public function setDefault(
        Request $request,
        DeliveryAddress $deliveryAddress
    ) {
        abort_unless(
            $deliveryAddress->user_id ===
                $request->user()->id,
            403
        );

        DB::transaction(function () use (
            $request,
            $deliveryAddress
        ) {
            DeliveryAddress::where(
                'user_id',
                $request->user()->id
            )->update([
                'is_default' => false,
            ]);

            $deliveryAddress->update([
                'is_default' => true,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' =>
            'Default delivery address updated.',
            'data' =>
            $deliveryAddress->fresh(),
        ]);
    }

    /**
     * Delete address.
     */
    public function destroy(
        Request $request,
        DeliveryAddress $deliveryAddress
    ) {
        abort_unless(
            $deliveryAddress->user_id ===
                $request->user()->id,
            403
        );

        $wasDefault =
            $deliveryAddress->is_default;

        $userId =
            $request->user()->id;

        $deliveryAddress->delete();

        if ($wasDefault) {
            $newDefault =
                DeliveryAddress::where(
                    'user_id',
                    $userId
                )
                ->latest()
                ->first();

            if ($newDefault) {
                $newDefault->update([
                    'is_default' => true,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' =>
            'Delivery address deleted successfully.',
        ]);
    }
}
