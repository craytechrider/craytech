<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryArea;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DeliveryAreaController extends Controller
{
    /**
     * Wildcard value.
     */
    private const ALL = 'ALL';

    /**
     * Get all delivery areas.
     *
     * Admin uses this endpoint to see all configured
     * delivery areas.
     */
    public function index()
    {
        try {
            $areas = DeliveryArea::query()
                ->orderBy('country')
                ->orderBy('region')
                ->orderBy('province')
                ->orderBy('municipality')
                ->orderBy('barangay')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $areas,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load delivery areas.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Normalize ALL hierarchy.
     *
     * Examples:
     *
     * Region = ALL
     * -> Province = ALL
     * -> Municipality = ALL
     * -> Barangay = ALL
     *
     * Province = ALL
     * -> Municipality = ALL
     * -> Barangay = ALL
     *
     * Municipality = ALL
     * -> Barangay = ALL
     */
    private function normalizeAreaData(
        string $country,
        string $region,
        string $province,
        string $municipality,
        string $barangay
    ): array {
        if ($region === self::ALL) {
            return [
                'country' => $country,
                'region' => self::ALL,
                'province' => self::ALL,
                'municipality' => self::ALL,
                'barangay' => self::ALL,
            ];
        }

        if ($province === self::ALL) {
            return [
                'country' => $country,
                'region' => $region,
                'province' => self::ALL,
                'municipality' => self::ALL,
                'barangay' => self::ALL,
            ];
        }

        if ($municipality === self::ALL) {
            return [
                'country' => $country,
                'region' => $region,
                'province' => $province,
                'municipality' => self::ALL,
                'barangay' => self::ALL,
            ];
        }

        return [
            'country' => $country,
            'region' => $region,
            'province' => $province,
            'municipality' => $municipality,
            'barangay' => $barangay,
        ];
    }

    /**
     * Add a delivery area.
     */
    public function store(Request $request)
    {
        $validator = Validator::make(
            $request->all(),
            [
                'country' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'region' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'province' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'municipality' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'barangay' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'is_active' => [
                    'nullable',
                    'boolean',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            /*
             * Normalize ALL hierarchy.
             */
            $areaData = $this->normalizeAreaData(
                $request->string('country')->toString(),
                $request->string('region')->toString(),
                $request->string('province')->toString(),
                $request->string('municipality')->toString(),
                $request->string('barangay')->toString(),
            );

            /*
             * Check duplicate.
             */
            $exists = DeliveryArea::query()
                ->where('country', $areaData['country'])
                ->where('region', $areaData['region'])
                ->where('province', $areaData['province'])
                ->where('municipality', $areaData['municipality'])
                ->where('barangay', $areaData['barangay'])
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'This delivery area already exists.',
                ], 409);
            }

            /*
             * Create area.
             */
            $area = DeliveryArea::create([
                'country' => $areaData['country'],
                'region' => $areaData['region'],
                'province' => $areaData['province'],
                'municipality' => $areaData['municipality'],
                'barangay' => $areaData['barangay'],
                'is_active' => $request->boolean(
                    'is_active',
                    true
                ),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Delivery area added successfully.',
                'data' => $area,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to add delivery area.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update a delivery area.
     */
    public function update(
        Request $request,
        DeliveryArea $deliveryArea
    ) {
        $validator = Validator::make(
            $request->all(),
            [
                'country' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'region' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'province' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'municipality' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'barangay' => [
                    'required',
                    'string',
                    'max:191',
                ],

                'is_active' => [
                    'required',
                    'boolean',
                ],
            ]
        );

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            /*
             * Normalize ALL hierarchy.
             */
            $areaData = $this->normalizeAreaData(
                $request->string('country')->toString(),
                $request->string('region')->toString(),
                $request->string('province')->toString(),
                $request->string('municipality')->toString(),
                $request->string('barangay')->toString(),
            );

            /*
             * Check duplicate excluding current record.
             */
            $exists = DeliveryArea::query()
                ->where('country', $areaData['country'])
                ->where('region', $areaData['region'])
                ->where('province', $areaData['province'])
                ->where('municipality', $areaData['municipality'])
                ->where('barangay', $areaData['barangay'])
                ->where(
                    'id',
                    '!=',
                    $deliveryArea->id
                )
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'This delivery area already exists.',
                ], 409);
            }

            /*
             * Update.
             */
            $deliveryArea->update([
                'country' => $areaData['country'],
                'region' => $areaData['region'],
                'province' => $areaData['province'],
                'municipality' => $areaData['municipality'],
                'barangay' => $areaData['barangay'],
                'is_active' => $request->boolean(
                    'is_active'
                ),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Delivery area updated successfully.',
                'data' => $deliveryArea->fresh(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update delivery area.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a delivery area.
     */
    public function destroy(
        DeliveryArea $deliveryArea
    ) {
        try {
            $deliveryArea->delete();

            return response()->json([
                'success' => true,
                'message' => 'Delivery area deleted successfully.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete delivery area.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
