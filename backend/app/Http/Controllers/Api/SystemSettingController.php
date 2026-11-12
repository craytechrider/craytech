<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    /**
     * Get order/delivery settings.
     */
    public function index()
    {
        $deliveryEnabled = Setting::where(
            'key',
            'delivery_enabled'
        )->value('value');

        return response()->json([
            'success' => true,
            'data' => [
                'delivery_enabled' =>
                $deliveryEnabled === null
                    ? true
                    : (bool) $deliveryEnabled,
            ],
        ]);
    }

    /**
     * Update delivery setting.
     */
    public function updateDelivery(Request $request)
    {
        $validated = $request->validate([
            'delivery_enabled' => [
                'required',
                'boolean',
            ],
        ]);

        $setting = Setting::updateOrCreate(
            [
                'key' => 'delivery_enabled',
            ],
            [
                'value' => $validated['delivery_enabled']
                    ? '1'
                    : '0',
            ]
        );

        return response()->json([
            'success' => true,
            'message' => $validated['delivery_enabled']
                ? 'Delivery has been enabled.'
                : 'Delivery has been disabled.',
            'data' => [
                'delivery_enabled' =>
                (bool) $validated['delivery_enabled'],
            ],
        ]);
    }
}
