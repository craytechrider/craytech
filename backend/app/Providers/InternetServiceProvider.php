<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\View;

class InternetServiceProvider extends ServiceProvider
{
    public function register() {}

    public function boot()
    {
        // Check internet connectivity once per request
        $connected = $this->checkInternet();

        // Share with all views
        View::share('internetConnected', $connected);
    }

    private function checkInternet()
    {
        try {
            $connected = @fsockopen("8.8.8.8", 53, $errno, $errstr, 2);
            if ($connected) {
                fclose($connected);
                return true;
            }
        } catch (\Exception $e) {
            return false;
        }
        return false;
    }
}
