<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class DeliveryPersonnelController extends Controller
{
    /**
     * =====================================================
     * LIST DELIVERY PERSONNEL
     * =====================================================
     */
    public function index()
    {
        try {
            $deliveryPersonnel = User::where(
                'role',
                'delivery'
            )
                ->orderBy('name')
                ->get([
                    'id',
                    'name',
                    'email',
                    'mobile_number',
                    'business_name',
                    'role',
                    'is_active',
                    'created_at',
                ]);

            return response()->json([
                'success' => true,
                'data' => $deliveryPersonnel,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load delivery personnel.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * =====================================================
     * CREATE DELIVERY ACCOUNT
     * =====================================================
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:191',
            ],

            'email' => [
                'required',
                'email',
                'max:191',
                'unique:users,email',
            ],

            'mobile_number' => [
                'nullable',
                'string',
                'max:191',
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        try {
            $delivery = User::create([
                'name' => $validated['name'],

                'email' => $validated['email'],

                'mobile_number' =>
                $validated['mobile_number'] ?? null,

                'password' => Hash::make(
                    $validated['password']
                ),

                /*
                 * IMPORTANT:
                 *
                 * Admin-created account automatically
                 * becomes a DELIVERY account.
                 */
                'role' => 'delivery',

                'is_active' => true,
            ]);

            return response()->json([
                'success' => true,

                'message' =>
                'Delivery personnel account created successfully.',

                'data' => [
                    'id' => $delivery->id,
                    'name' => $delivery->name,
                    'email' => $delivery->email,
                    'mobile_number' =>
                    $delivery->mobile_number,
                    'role' => $delivery->role,
                    'is_active' =>
                    $delivery->is_active,
                ],
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' =>
                'Failed to create delivery account.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * =====================================================
     * UPDATE DELIVERY ACCOUNT
     * =====================================================
     */
    public function update(
        Request $request,
        User $user
    ) {
        /*
         * Make sure the selected user is actually
         * a delivery account.
         */
        if ($user->role !== 'delivery') {
            return response()->json([
                'success' => false,
                'message' =>
                'The selected user is not delivery personnel.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:191',
            ],

            'email' => [
                'required',
                'email',
                'max:191',
                Rule::unique('users', 'email')
                    ->ignore($user->id),
            ],

            'mobile_number' => [
                'nullable',
                'string',
                'max:191',
            ],

            'password' => [
                'nullable',
                'string',
                'min:8',
                'confirmed',
            ],

            'is_active' => [
                'required',
                'boolean',
            ],
        ]);

        try {
            $user->name =
                $validated['name'];

            $user->email =
                $validated['email'];

            $user->mobile_number =
                $validated['mobile_number'] ?? null;

            $user->is_active =
                $validated['is_active'];

            /*
             * Only change password if Admin
             * entered a new one.
             */
            if (
                !empty($validated['password'])
            ) {
                $user->password =
                    Hash::make(
                        $validated['password']
                    );
            }

            $user->save();

            /*
             * If account was disabled,
             * invalidate existing login tokens.
             */
            if (!$user->is_active) {
                $user->tokens()->delete();
            }

            return response()->json([
                'success' => true,

                'message' =>
                'Delivery personnel updated successfully.',

                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'mobile_number' =>
                    $user->mobile_number,
                    'role' => $user->role,
                    'is_active' =>
                    $user->is_active,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' =>
                'Failed to update delivery personnel.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * =====================================================
     * ENABLE / DISABLE DELIVERY ACCOUNT
     * =====================================================
     */
    public function toggleStatus(User $user)
    {
        if ($user->role !== 'delivery') {
            return response()->json([
                'success' => false,
                'message' =>
                'The selected user is not delivery personnel.',
            ], 404);
        }

        try {
            $user->is_active =
                !$user->is_active;

            $user->save();

            /*
             * If disabled, immediately invalidate
             * existing Sanctum tokens.
             */
            if (!$user->is_active) {
                $user->tokens()->delete();
            }

            return response()->json([
                'success' => true,

                'message' => $user->is_active
                    ? 'Delivery account activated successfully.'
                    : 'Delivery account disabled successfully.',

                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'is_active' =>
                    $user->is_active,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' =>
                'Failed to update account status.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * =====================================================
     * DELETE DELIVERY ACCOUNT
     * =====================================================
     */
    public function destroy(User $user)
    {
        if ($user->role !== 'delivery') {
            return response()->json([
                'success' => false,
                'message' =>
                'The selected user is not delivery personnel.',
            ], 404);
        }

        try {
            /*
             * Remove login tokens first.
             */
            $user->tokens()->delete();

            $user->delete();

            return response()->json([
                'success' => true,
                'message' =>
                'Delivery personnel account deleted successfully.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' =>
                'Failed to delete delivery personnel.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
