<?php

namespace App\Http\Controllers;

use Kreait\Firebase\Factory;

class SensorController extends Controller
{
    public function index()
    {
        /*
        |--------------------------------------------------------------------------
        | Firebase
        |--------------------------------------------------------------------------
        */

        $factory = (new Factory)
            ->withServiceAccount(
                storage_path('app/firebase.json')
            )
            ->withDatabaseUri(
                'https://crane-b8378-default-rtdb.asia-southeast1.firebasedatabase.app/'
            );

        $database = $factory->createDatabase();


        /*
        |--------------------------------------------------------------------------
        | Date / Time
        |--------------------------------------------------------------------------
        */

        $today = date('Y-m-d');
        $now = time();


        /*
        |--------------------------------------------------------------------------
        | Helper
        |--------------------------------------------------------------------------
        */

        $filter = function ($values) use ($today, $now) {

            $filtered = [];

            if (!is_array($values)) {
                return $filtered;
            }

            foreach ($values as $timeStr => $value) {

                $parts = explode('-', $timeStr);

                if (count($parts) === 3) {

                    [$h, $m, $s] = array_map(
                        'intval',
                        $parts
                    );

                    $readingTs = strtotime(
                        "{$today} {$h}:{$m}:{$s}"
                    );

                    if ($readingTs !== false) {

                        if ($readingTs >= $now - (5 * 3600)) {

                            $filtered[$timeStr] = $value;
                        }
                    }
                }
            }

            return $filtered;
        };


        /*
        |--------------------------------------------------------------------------
        | WATER TEMPERATURE
        |--------------------------------------------------------------------------
        */

        $tempValues = $database
            ->getReference("sensors/waterTemp/{$today}")
            ->getValue() ?? [];

        $filteredTemp = $filter($tempValues);

        $latestTemp = !empty($filteredTemp)
            ? end($filteredTemp)
            : null;


        /*
        |--------------------------------------------------------------------------
        | pH
        |--------------------------------------------------------------------------
        */

        $phValues = $database
            ->getReference("sensors/ph/{$today}")
            ->getValue() ?? [];

        $filteredPh = $filter($phValues);

        $latestPh = !empty($filteredPh)
            ? end($filteredPh)
            : null;


        /*
        |--------------------------------------------------------------------------
        | BATTERY VOLTAGE
        |--------------------------------------------------------------------------
        */

        $batteryValues = $database
            ->getReference("sensors/batteryVoltage/{$today}")
            ->getValue() ?? [];

        $filteredBattery = $filter($batteryValues);

        $latestBatteryVoltage = !empty($filteredBattery)
            ? end($filteredBattery)
            : null;


        /*
        |--------------------------------------------------------------------------
        | BATTERY PERCENTAGE
        |--------------------------------------------------------------------------
        |
        | 12V lead-acid battery:
        |
        | 10.5V = 0%
        | 12.6V = 100%
        |
        */

        $latestBatteryPercent = null;

        if ($latestBatteryVoltage !== null) {

            $minVoltage = 10.5;
            $maxVoltage = 12.6;

            $latestBatteryPercent =
                (($latestBatteryVoltage - $minVoltage)
                    / ($maxVoltage - $minVoltage)) * 100;

            // Prevent below 0%
            if ($latestBatteryPercent < 0) {
                $latestBatteryPercent = 0;
            }

            // Prevent above 100%
            if ($latestBatteryPercent > 100) {
                $latestBatteryPercent = 100;
            }
        }


        /*
        |--------------------------------------------------------------------------
        | WATER LEVEL
        |--------------------------------------------------------------------------
        */

        $levelValues = $database
            ->getReference("sensors/waterLevel/{$today}")
            ->getValue() ?? [];

        $filteredLevel = $filter($levelValues);

        $latestLevel = !empty($filteredLevel)
            ? end($filteredLevel)
            : null;


        /*
        |--------------------------------------------------------------------------
        | WATER PERCENTAGE
        |--------------------------------------------------------------------------
        */

        $waterPercentValues = $database
            ->getReference("sensors/waterPercent/{$today}")
            ->getValue() ?? [];

        $filteredWaterPercent = $filter($waterPercentValues);

        $latestWaterPercent = !empty($filteredWaterPercent)
            ? end($filteredWaterPercent)
            : null;


        /*
        |--------------------------------------------------------------------------
        | THRESHOLDS
        |--------------------------------------------------------------------------
        */

        $thresholds = $database
            ->getReference("settings/thresholds")
            ->getValue() ?? [];


        /*
        |--------------------------------------------------------------------------
        | ALERTS
        |--------------------------------------------------------------------------
        */

        $alertsRaw = $database
            ->getReference("alerts")
            ->getValue() ?? [];

        $alerts = [];

        foreach ($alertsRaw as $key => $data) {

            if (is_array($data)) {

                $alerts[$key] = [
                    'status' => $data['status'] ?? 'unknown',
                    'value' => $data['value'] ?? null,
                ];
            } else {

                $alerts[$key] = [
                    'status' => $data,
                    'value' => null,
                ];
            }
        }


        /*
        |--------------------------------------------------------------------------
        | DASHBOARD
        |--------------------------------------------------------------------------
        */

        return view('admin.dashboard', [

            'today' => $today,

            // Temperature
            'values' => $filteredTemp,
            'latestTemp' => $latestTemp,

            // pH
            'phValues' => $filteredPh,
            'latestPh' => $latestPh,

            // Battery
            'batteryValues' => $filteredBattery,
            'latestBatteryVoltage' => $latestBatteryVoltage,
            'latestBatteryPercent' => $latestBatteryPercent,

            // Water level
            'levelValues' => $filteredLevel,
            'latestLevel' => $latestLevel,

            // Water percentage
            'waterPercentValues' => $filteredWaterPercent,
            'latestWaterPercent' => $latestWaterPercent,

            // Settings
            'thresholds' => $thresholds,

            // Alerts
            'alerts' => $alerts,
        ]);
    }
}
