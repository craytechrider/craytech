<x-app-layout>
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-700">Reports</h1>
        <button class="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700">
            Generate Report
        </button>
    </div>

    <!-- Water Quality Report -->
    <div class="bg-white shadow rounded p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Water Quality Report</h2>
        <canvas id="lineChart"></canvas>
    </div>

    <!-- Progress Indicators -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="bg-white shadow rounded p-6 flex flex-col items-center">
            <h2 class="text-sm text-gray-500 mb-2">System Health</h2>
            <canvas id="progress1" width="120" height="120"></canvas>
        </div>
        <div class="bg-white shadow rounded p-6 flex flex-col items-center">
            <h2 class="text-sm text-gray-500 mb-2">Feeding Efficiency</h2>
            <canvas id="progress2" width="120" height="120"></canvas>
        </div>
    </div>

    <!-- Feeding Log -->
    <div class="bg-white shadow rounded p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Feeding Log</h2>
        <canvas id="barChart"></canvas>
    </div>

    <!-- Alert History -->
    <div class="bg-white shadow rounded p-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Alert History</h2>
        <canvas id="alertChart"></canvas>
    </div>

    <!-- Chart Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        // Water Quality Line Chart
        new Chart(document.getElementById('lineChart'), {
            type: 'line',
            data: {
                labels: ['8 AM', '12 PM', '3 PM', '7 PM', '12 AM'],
                datasets: [{
                        label: 'Water Level',
                        data: [0.7, 0.8, 0.9, 0.85, 0.8],
                        borderColor: '#10b981',
                        fill: false
                    },
                    {
                        label: 'Temperature',
                        data: [24, 25, 24, 23, 24],
                        borderColor: '#dc2626',
                        fill: false
                    },
                    {
                        label: 'pH',
                        data: [7.1, 7.2, 7.3, 7.2, 7.1],
                        borderColor: '#2563eb',
                        fill: false
                    },
                    {
                        label: 'Turbidity',
                        data: [10, 12, 13, 11, 12],
                        borderColor: '#facc15',
                        fill: false
                    }
                ]
            }
        });

        // Progress Indicators (Doughnut Charts)
        function createProgressChart(id, value) {
            return new Chart(document.getElementById(id), {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Remaining'],
                    datasets: [{
                        data: [value, 100 - value],
                        backgroundColor: ['#2563eb', '#e5e7eb']
                    }]
                },
                options: {
                    cutout: '70%'
                }
            });
        }
        createProgressChart('progress1', 65);
        createProgressChart('progress2', 65);

        // Feeding Log Bar Chart
        new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: {
                labels: ['Item 1', 'Item 2', 'Item 3', 'Item 4'],
                datasets: [{
                    label: 'Quantity (g)',
                    data: [12, 19, 8, 15],
                    backgroundColor: '#2563eb'
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 20
                    }
                }
            }
        });

        // Alert History Line Chart
        new Chart(document.getElementById('alertChart'), {
            type: 'line',
            data: {
                labels: ['8 AM', '12 PM', '3 PM', '7 PM', '12 AM'],
                datasets: [{
                        label: 'Water Level',
                        data: [0.7, 0.8, 0.9, 0.85, 0.8],
                        borderColor: '#10b981',
                        fill: false
                    },
                    {
                        label: 'Temperature',
                        data: [24, 25, 24, 23, 24],
                        borderColor: '#dc2626',
                        fill: false
                    },
                    {
                        label: 'pH',
                        data: [7.1, 7.2, 7.3, 7.2, 7.1],
                        borderColor: '#2563eb',
                        fill: false
                    },
                    {
                        label: 'Turbidity',
                        data: [10, 12, 13, 11, 12],
                        borderColor: '#facc15',
                        fill: false
                    }
                ]
            }
        });
    </script>
</x-app-layout>