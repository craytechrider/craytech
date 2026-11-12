<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class UserProfileController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | GET PROFILE
    |--------------------------------------------------------------------------
    */

    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile_number' => $user->mobile_number,
                'business_name' => $user->business_name,
                'role' => $user->role,
            ],
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE PROFILE
    |--------------------------------------------------------------------------
    */

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],

            'mobile_number' => [
                'nullable',
                'string',
                'max:20',
            ],

            'business_name' => [
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check the information you entered.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        /*
        |--------------------------------------------------------------------------
        | UPDATE USER
        |--------------------------------------------------------------------------
        */

        $user->name = $validated['name'];
        $user->email = $validated['email'];

        $user->mobile_number = $validated['mobile_number'] ?? null;

        $user->business_name = $validated['business_name'] ?? null;

        $user->save();

        /*
        |--------------------------------------------------------------------------
        | RETURN UPDATED USER
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'success' => true,
            'message' => 'Profile information updated successfully.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile_number' => $user->mobile_number,
                'business_name' => $user->business_name,
                'role' => $user->role,
            ],
        ]);
    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE PASSWORD
    |--------------------------------------------------------------------------
    */

    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'current_password' => [
                'required',
                'string',
            ],

            'new_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please check your password information.',
                'errors' => $validator->errors(),
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK CURRENT PASSWORD
        |--------------------------------------------------------------------------
        */

        if (!Hash::check(
            $request->current_password,
            $user->password
        )) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | UPDATE PASSWORD
        |--------------------------------------------------------------------------
        */

        $user->password = Hash::make(
            $request->new_password
        );

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }
}
