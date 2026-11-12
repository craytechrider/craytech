<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;
use Kreait\Firebase\Factory;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Log;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        View::composer('*', function ($view) {
            $alerts = Cache::remember('alerts', 30, function () {
                try {
                    $factory = (new Factory)
                        ->withServiceAccount(storage_path('app/firebase.json'))
                        ->withDatabaseUri('https://crane-b8378-default-rtdb.asia-southeast1.firebasedatabase.app/');

                    $database = $factory->createDatabase();
                    return $database->getReference("alerts")->getValue() ?? [];
                } catch (\Exception $e) {
                    // Log the error for debugging
                    Log::error('Firebase connection failed: ' . $e->getMessage());

                    // Return a safe placeholder instead of crashing
                    return [
                        'status'  => 'warning',
                        'message' => '⚠️ No internet connection. Some features may not work.'
                    ];
                }
            });

            $view->with('alerts', $alerts);
        });
    }
}
