<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Welcome | CRAYTECH</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body class="font-sans antialiased"
    style="margin:0; background: linear-gradient(rgba(10,31,68,0.6), rgba(46,79,133,0.6)), 
             url('{{ asset('images/background.jpg') }}') no-repeat center center fixed; 
             background-size: cover;">


    <div class="min-h-screen flex flex-col items-center justify-center text-center px-6 relative">
        <!-- Logo -->
        <div class="mb-6">
            <img src="{{ asset('images/logo.png') }}" alt="CRAYTECH Logo"
                class="h-28 w-28 mx-auto drop-shadow-lg">
        </div>

        <!-- Title -->
        <h1 class="text-5xl font-extrabold text-white tracking-tight mb-4">
            Welcome to CRAYTECH
        </h1>

        <!-- Tagline -->
        <p class="text-lg max-w-2xl text-gray-100 mb-10 leading-relaxed">
            Smart pond monitoring and e‑commerce platform for crayfish farming.
        </p>

        <!-- Actions -->
        <div class="flex space-x-6">
            @auth
            @if(Auth::user()->role === 'admin')
            <a href="{{ route('dashboard') }}"
                class="px-8 py-3 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition">
                Go to Admin Dashboard
            </a>
            @else
            <a href="{{ route('customer.buy') }}"
                class="px-8 py-3 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition">
                Go to Customer Dashboard
            </a>
            @endif
            @else
            <a href="{{ route('login') }}"
                class="px-8 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
                Login
            </a>
            <a href="{{ route('register') }}"
                class="px-8 py-3 bg-gray-800 text-white rounded-lg shadow hover:bg-gray-900 transition">
                Sign Up
            </a>
            @endauth
        </div>
    </div>



</body>

</html>