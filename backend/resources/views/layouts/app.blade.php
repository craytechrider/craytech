<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Laravel') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body class="bg-gray-100 font-sans antialiased"
    x-data="{ open: JSON.parse(localStorage.getItem('notifOpen') ?? 'true') }"
    x-init="$watch('open', value => localStorage.setItem('notifOpen', JSON.stringify(value)))">
    <!-- Sidebar -->
    @include('layouts.navigation')

    <!-- Main Content Wrapper -->
    <div class="ml-64 min-h-screen flex overflow-hidden">

        <div class="flex-1 p-6 mt-16 overflow-y-auto">
            <!-- Top Bar -->
            <header class="fixed top-0 left-64 right-0 h-16 bg-white shadow flex justify-between items-center px-6">
                <h1 class="text-xl font-semibold"> </h1>
                <div class="flex items-center space-x-4">
                    <!-- Bell toggles notifications -->
                    <button @click="open = !open"
                        class="p-2 rounded-full bg-gray-200 hover:bg-gray-300">🔔</button>
                    <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        {{ strtoupper(substr(Auth::user()->name,0,1)) }}
                    </div>
                </div>
            </header>

            <!-- Slot for dashboard.blade.php -->
            <main>
                {{ $slot }}
            </main>
        </div>

        <!-- Notifications Panel (right side) -->
        <div x-show="open" x-transition
            class="w-80 bg-yellow-100 shadow-lg rounded-xl p-6 mt-16 flex-shrink-0 overflow-y-auto">
            <h2 class="text-sm font-semibold text-gray-700 mb-2">Notifications</h2>
            <div class="space-y-2">
                @forelse($alerts as $key => $alert)
                <div class="p-2 rounded
        @if($alert['status'] === 'out_of_range') bg-red-200 text-red-800
        @elseif($alert['status'] === 'normal') bg-green-200 text-green-800
        @else bg-blue-200 text-blue-800
        @endif">
                    {{ ucfirst($key) }}: {{ $alert['status'] }}
                    @if($alert['value'])
                    (Value: {{ $alert['value'] }})
                    @endif
                </div>
                @empty
                <div class="bg-gray-200 text-gray-600 p-2 rounded">
                    No alerts at the moment
                </div>
                @endforelse
            </div>
        </div>
    </div>
</body>

</html>