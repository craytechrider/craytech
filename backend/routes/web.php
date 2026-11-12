<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SocialAuthController;

// Google and Facebook OAuth redirects and callbacks.
Route::get('/auth/{provider}/redirect', [
    SocialAuthController::class,
    'redirect'
])->whereIn('provider', ['google', 'facebook']);

Route::get('/auth/{provider}/callback', [
    SocialAuthController::class,
    'callback'
])->whereIn('provider', ['google', 'facebook']);
