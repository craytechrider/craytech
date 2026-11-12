<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\DeviceToken;

class DeviceTokenController extends Controller
{
    /**
     * Register or update the logged-in user's browser FCM token.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string|max:512',
            'device_name' => 'nullable|string|max:191',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid device token.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        $deviceToken = DeviceToken::updateOrCreate(
            [
                'user_id' => $user->id,
                'token' => $request->token,
            ],
            [
                'device_name' => $request->device_name ?? 'Unknown Browser',
                'last_used_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Device token registered successfully.',
            'data' => [
                'id' => $deviceToken->id,
                'device_name' => $deviceToken->device_name,
            ],
        ]);
    }

    /**
     * Remove an FCM token belonging to the logged-in user.
     */
    public function destroy(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string|max:512',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid device token.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $deleted = DeviceToken::where('user_id', $request->user()->id)
            ->where('token', $request->token)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => $deleted
                ? 'Device token removed successfully.'
                : 'Device token was not found.',
        ]);
    }
}
