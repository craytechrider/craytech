<nav class="fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-blue-700 to-blue-900 text-white flex flex-col">
    <!-- Logo -->
    <div class="p-8 border-b border-blue-800 flex flex-col items-center">
        <a href="{{ Auth::user()->role === 'admin' ? route('dashboard') : route('customer.dashboard') }}"
            class="flex flex-col items-center space-y-3">
            <div class="w-32 h-32 flex items-center justify-center bg-white rounded-lg shadow-lg relative">
                <img src="{{ asset('images/logo.png') }}" alt="CRAYTECH Logo" class="w-24 h-auto">
                <div class="absolute inset-0 bg-white opacity-20"
                    style="clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);"></div>
            </div>
            <span class="text-2xl font-extrabold tracking-wide">CRAYTECH</span>
        </a>
    </div>

    <!-- Navigation Links -->
    <div class="flex-1 p-4 space-y-2">
        @if(Auth::user()->role === 'admin')
        <a href="{{ route('dashboard') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('dashboard') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">Dashboard</span>
        </a>

        <a href="{{ route('control') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('control') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">Control</span>
        </a>

        <a href="{{ route('farm-management') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('farm-management') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">Farm Management</span>
        </a>

        <a href="{{ route('batches.index') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('batches.*') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">Batches</span>
        </a>

        <a href="{{ route('report') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('report') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">Report</span>
        </a>

        <a href="{{ route('sell') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('sell') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">Sell</span>
        </a>

        <a href="{{ route('orders.index') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('orders.*') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">Orders</span>
        </a>
        @else
        <a href="{{ route('customer.dashboard') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('customer.dashboard') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">Dashboard</span>
        </a>
        <a href="{{ route('customer.cart') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('customer.cart') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">My Cart</span>
        </a>
        <a href="{{ route('customer.orders') }}"
            class="flex items-center px-3 py-2 rounded {{ request()->routeIs('customer.orders') ? 'bg-blue-700' : 'hover:bg-blue-800' }}">
            <span class="ml-2">My Orders</span>
        </a>
        @endif
    </div>

    <!-- User / Logout -->
    <div class="p-4 border-t border-blue-800">
        <form method="POST" action="{{ route('logout') }}">
            @csrf
            <button type="submit"
                class="flex items-center w-full px-3 py-2 rounded hover:bg-red-600 transition">
                <span class="ml-2">Logout</span>
            </button>
        </form>
    </div>
</nav>