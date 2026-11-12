<x-app-layout>
    <div x-data="{ mode: 'automation' }" class="space-y-6"><!-- Top Row: Feeder, Drainage, Refill -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6"><!-- Feeder -->
            <div class="bg-white shadow rounded p-6">
                <h2 class="text-lg font-semibold text-gray-700 mb-4">Feeder</h2>
                <div class="space-y-4">
                    <div><label class="block text-sm text-gray-500">Dispense Amount (g)</label><input type="number" class="w-full border rounded px-3 py-2"></div>
                    <div><label class="block text-sm text-gray-500">Duration (sec)</label><input type="number" class="w-full border rounded px-3 py-2"></div>
                    <div class="flex space-x-2"><button class="px-4 py-2 bg-green-600 text-white rounded">Start</button><button class="px-4 py-2 bg-yellow-500 text-white rounded">Pause</button><button class="px-4 py-2 bg-red-600 text-white rounded">Stop</button></div>
                </div>
            </div>
            <!-- Drainage -->
            <div class="bg-white shadow rounded p-6">
                <h2 class="text-lg font-semibold text-gray-700 mb-4">Drainage</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-500">Target Level (m)</label>
                        <input type="number" class="w-full border rounded px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-500">Max Runtime (min)</label>
                        <input type="number" class="w-full border rounded px-3 py-2">
                    </div>
                    <div class="flex space-x-2">
                        <button class="px-4 py-2 bg-green-600 text-white rounded">Start</button>
                        <button class="px-4 py-2 bg-red-600 text-white rounded">Stop</button>
                    </div>
                </div>
            </div>

            <!-- Refill -->
            <div class="bg-white shadow rounded p-6">
                <h2 class="text-lg font-semibold text-gray-700 mb-4">Refill</h2>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-500">Top-up Volume (L)</label>
                        <input type="number" class="w-full border rounded px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-500">Target Level (m)</label>
                        <input type="number" class="w-full border rounded px-3 py-2">
                    </div>
                    <div class="flex space-x-2">
                        <button class="px-4 py-2 bg-green-600 text-white rounded">Start</button>
                        <button class="px-4 py-2 bg-red-600 text-white rounded">Stop</button>
                    </div>
                </div>
            </div>
        </div>
        <div x-data="{ mode: 'automation' }" class="space-y-6">

            <!-- Toggle Buttons -->
            <div class="flex space-x-4">
                <button @click="mode = 'automation'"
                    :class="mode === 'automation' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                    class="px-4 py-2 rounded">
                    Automation
                </button>
                <button @click="mode = 'threshold'"
                    :class="mode === 'threshold' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                    class="px-4 py-2 rounded">
                    Threshold
                </button>
            </div>

            <!-- Automation Cards -->
            <div x-show="mode === 'automation'" class="grid grid-cols-1 md:grid-cols-2 gap-6">

                <!-- Feeding Schedule -->
                <div class="bg-white shadow rounded p-6">
                    <h2 class="text-lg font-semibold text-gray-700 mb-4">Feeding Schedule</h2>
                    <form action="{{ route('settings.automation') }}" method="POST" class="space-y-4">
                        @csrf
                        <label class="block text-sm text-gray-500">Slot (HH:MM)</label>
                        <input type="time" name="feeding_slot"
                            value="{{ old('feeding_slot', $automation['feeding_slot'] ?? '') }}"
                            class="w-full border rounded px-3 py-2">

                        <label class="block text-sm text-gray-500">Quantity per Slot (g)</label>
                        <input type="number" step="0.01" name="feeding_quantity"
                            value="{{ old('feeding_quantity', $automation['feeding_quantity'] ?? '') }}"
                            class="w-full border rounded px-3 py-2">

                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Save Schedule</button>
                    </form>
                </div>

                <!-- Water Level Automation -->
                <div class="bg-white shadow rounded p-6">
                    <h2 class="text-lg font-semibold text-gray-700 mb-4">Water Level Automation</h2>
                    <form action="{{ route('settings.automation') }}" method="POST" class="space-y-4">
                        @csrf
                        <label class="block text-sm text-gray-500">High Level Trigger (m)</label>
                        <input type="number" step="0.01" name="water_high"
                            value="{{ old('water_high', $automation['water_high'] ?? '') }}"
                            class="w-full border rounded px-3 py-2">

                        <label class="block text-sm text-gray-500">Low Level Guard (m)</label>
                        <input type="number" step="0.01" name="water_low"
                            value="{{ old('water_low', $automation['water_low'] ?? '') }}"
                            class="w-full border rounded px-3 py-2">

                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Save Automation</button>
                    </form>
                </div>
            </div>

            <!-- Threshold Cards -->
            <div x-show="mode === 'threshold'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <form action="{{ route('settings.threshold') }}" method="POST" class="contents">
                    @csrf

                    <!-- pH -->
                    <div class="bg-white shadow rounded p-6">
                        <h2 class="text-lg font-semibold text-gray-700 mb-4">pH</h2>
                        <label class="block text-sm text-gray-500">Low</label>
                        <input type="number" step="0.01" name="ph_low"
                            value="{{ old('ph_low', $thresholds['ph_low'] ?? '') }}"
                            class="w-full border rounded px-3 py-2 mb-2">
                        <label class="block text-sm text-gray-500">High</label>
                        <input type="number" step="0.01" name="ph_high"
                            value="{{ old('ph_high', $thresholds['ph_high'] ?? '') }}"
                            class="w-full border rounded px-3 py-2">
                    </div>

                    <!-- Temperature -->
                    <div class="bg-white shadow rounded p-6">
                        <h2 class="text-lg font-semibold text-gray-700 mb-4">Temperature (°C)</h2>
                        <label class="block text-sm text-gray-500">Low</label>
                        <input type="number" step="0.01" name="temp_low"
                            value="{{ old('temp_low', $thresholds['temp_low'] ?? '') }}"
                            class="w-full border rounded px-3 py-2 mb-2">
                        <label class="block text-sm text-gray-500">High</label>
                        <input type="number" step="0.01" name="temp_high"
                            value="{{ old('temp_high', $thresholds['temp_high'] ?? '') }}"
                            class="w-full border rounded px-3 py-2">
                    </div>

                    <!-- Salinity -->
                    <div class="bg-white shadow rounded p-6">
                        <h2 class="text-lg font-semibold text-gray-700 mb-4">Salinity</h2>
                        <label class="block text-sm text-gray-500">Low</label>
                        <input type="number" step="0.01" name="salinity_low"
                            value="{{ old('salinity_low', $thresholds['salinity_low'] ?? '') }}"
                            class="w-full border rounded px-3 py-2 mb-2">
                        <label class="block text-sm text-gray-500">High</label>
                        <input type="number" step="0.01" name="salinity_high"
                            value="{{ old('salinity_high', $thresholds['salinity_high'] ?? '') }}"
                            class="w-full border rounded px-3 py-2">
                    </div>

                    <!-- Water Level -->
                    <div class="bg-white shadow rounded p-6">
                        <h2 class="text-lg font-semibold text-gray-700 mb-4">Water Level</h2>
                        <label class="block text-sm text-gray-500">Low</label>
                        <input type="number" step="0.01" name="water_low"
                            value="{{ old('water_low', $thresholds['water_low'] ?? '') }}"
                            class="w-full border rounded px-3 py-2 mb-2">
                        <label class="block text-sm text-gray-500">High</label>
                        <input type="number" step="0.01" name="water_high"
                            value="{{ old('water_high', $thresholds['water_high'] ?? '') }}"
                            class="w-full border rounded px-3 py-2">
                    </div>

                    <!-- Save Threshold Button -->
                    <div class="lg:col-span-4 text-right mt-4">
                        <button type="submit" class="px-6 py-2 bg-red-500 text-white rounded">
                            Save Thresholds
                        </button>
                    </div>
                </form>
            </div>

        </div>
</x-app-layout>