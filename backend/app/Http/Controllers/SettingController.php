<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use Kreait\Firebase\Factory;

class SettingController extends Controller
{
    public function storeAutomation(Request $request)
    {
        $automationKeys = [
            'feeding_slot'     => $request->feeding_slot,
            'feeding_quantity' => $request->feeding_quantity,
            'water_high'       => $request->water_high,
            'water_low'        => $request->water_low,
        ];

        foreach ($automationKeys as $key => $value) {
            if (!is_null($value)) {
                Setting::updateOrCreate(
                    ['type' => 'automation', 'key' => $key],
                    ['value' => $value]
                );
            }
        }

        $this->syncFirebase('automation', $automationKeys);

        return back()->with('success', 'Automation settings saved!');
    }

    public function storeThreshold(Request $request)
    {
        $keys = [
            'ph_low',
            'ph_high',
            'temp_low',
            'temp_high',
            'turbidity_low',
            'turbidity_high',
            'water_low',
            'water_high'
        ];

        $thresholds = [];

        foreach ($keys as $key) {
            if ($request->filled($key)) {
                Setting::updateOrCreate(
                    ['type' => 'threshold', 'key' => $key],
                    ['value' => $request->$key]
                );
                $thresholds[$key] = $request->$key;
            }
        }

        $this->syncFirebase('thresholds', $thresholds);

        return back()->with('success', 'Thresholds saved!');
    }

    public function control()
    {
        $automation = Setting::where('type', 'automation')->pluck('value', 'key');
        $thresholds = Setting::where('type', 'threshold')->pluck('value', 'key');

        return view('admin.control', compact('automation', 'thresholds'));
    }

    private function syncFirebase(string $path, array $data)
    {
        $factory = (new Factory)
            ->withServiceAccount(storage_path('app/firebase.json'))
            ->withDatabaseUri('https://crane-b8378-default-rtdb.asia-southeast1.firebasedatabase.app/');

        $database = $factory->createDatabase();
        $database->getReference("settings/{$path}")->update($data);
    }
}
