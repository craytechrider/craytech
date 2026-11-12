<x-app-layout>
    <!-- Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <!-- Water Temperature -->
        <div class="bg-blue-100 shadow-lg rounded-xl p-6">

            <h2 class="text-sm text-gray-600">
                Water Temperature ({{ $today }})
            </h2>

            <p id="latestTemp"
                class="text-3xl font-bold text-blue-800">

                {{ $latestTemp !== null
                ? number_format($latestTemp, 2) . ' °C'
                : 'No data'
            }}

            </p>

            <p class="text-xs text-gray-500">
                Latest reading
            </p>

            @if($latestTemp !== null)

            @if($latestTemp < ($thresholds['temp_low'] ?? 20))

                <span class="text-red-600 font-semibold">
                Low
                </span>

                @elseif($latestTemp > ($thresholds['temp_high'] ?? 30))

                <span class="text-red-600 font-semibold">
                    High
                </span>

                @else

                <span class="text-green-600 font-semibold">
                    Good
                </span>

                @endif

                @endif

        </div>


        <!-- pH -->
        <div class="bg-green-100 shadow-lg rounded-xl p-6">

            <h2 class="text-sm text-gray-600">
                pH ({{ $today }})
            </h2>

            <p id="latestPh"
                class="text-3xl font-bold text-green-800">

                {{ $latestPh !== null
                ? number_format($latestPh, 2)
                : 'No data'
            }}

            </p>

            <p class="text-xs text-gray-500">
                Latest reading
            </p>

            @if($latestPh !== null)

            @if($latestPh < ($thresholds['ph_low'] ?? 6.5))

                <span class="text-red-600 font-semibold">
                Low
                </span>

                @elseif($latestPh > ($thresholds['ph_high'] ?? 8.5))

                <span class="text-red-600 font-semibold">
                    High
                </span>

                @else

                <span class="text-green-600 font-semibold">
                    Good
                </span>

                @endif

                @endif

        </div>


        <!-- Water Level -->
        <div class="bg-teal-100 shadow-lg rounded-xl p-6">

            <h2 class="text-sm text-gray-600">
                Water Level
            </h2>

            <p id="latestLevel"
                class="text-3xl font-bold text-teal-800">

                {{ $latestLevel !== null
                ? number_format($latestLevel, 2) . ' cm'
                : 'No data'
            }}

            </p>

            <p class="text-xs text-gray-500">
                Current water level
            </p>

            @if($latestWaterPercent !== null)

            <span class="text-teal-700 font-semibold">
                {{ number_format($latestWaterPercent, 1) }}%
            </span>

            @endif

        </div>


        <!-- Battery -->
        <div class="bg-yellow-100 shadow-lg rounded-xl p-6">

            <h2 class="text-sm text-gray-600">
                Battery
            </h2>

            <p id="latestBattery"
                class="text-3xl font-bold text-yellow-800">

                {{ $latestBatteryPercent !== null
                ? number_format($latestBatteryPercent, 0) . '%'
                : 'No data'
            }}

            </p>

            <p class="text-xs text-gray-500">
                Battery percentage
            </p>

            @if($latestBatteryVoltage !== null)

            <p id="batteryVoltage"
                class="text-sm text-gray-600 mt-2">

                {{ number_format($latestBatteryVoltage, 2) }} V

            </p>

            @endif

        </div>

    </div>

    <!-- Chart -->
    <div class="bg-white shadow-lg rounded-xl p-6 mt-6">

        <h2 class="text-sm text-gray-600 mb-4">
            Water Quality & Level Trends (Today)
        </h2>

        <div style="height: 450px;">
            <canvas id="lineChart"></canvas>
        </div>

    </div>


    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <script>
        let lineChart = null;


        // ==========================================================
        // LARAVEL BASE URL
        // ==========================================================

        const baseUrl = "{{ request()->getBaseUrl() }}";


        // ==========================================================
        // API URLS
        // ==========================================================

        const tempUrl =
            baseUrl + "/api/water-temp";

        const phUrl =
            baseUrl + "/api/ph";

        const batteryUrl =
            baseUrl + "/api/battery-voltage";

        const levelUrl =
            baseUrl + "/api/water-level";


        // ==========================================================
        // GET LATEST VALUE
        // ==========================================================

        function getLatestValue(data) {
            const values = Object.values(data);

            if (values.length === 0) {
                return null;
            }

            return Number(values[values.length - 1]);
        }


        // ==========================================================
        // CREATE CHART
        // ==========================================================

        function createChart(
            labels,
            temps,
            phs,
            levels
        ) {

            const canvas =
                document.getElementById('lineChart');

            if (!canvas) {

                console.error(
                    "lineChart canvas not found."
                );

                return;
            }


            const ctx =
                canvas.getContext('2d');


            // Destroy old chart

            if (lineChart !== null) {

                lineChart.destroy();

            }


            lineChart = new Chart(ctx, {

                type: 'line',

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label: 'Water Temperature (°C)',

                            data: temps,

                            borderColor: 'blue',

                            backgroundColor: 'rgba(0, 0, 255, 0.10)',

                            fill: false,

                            tension: 0.3,

                            pointRadius: 3
                        },

                        {
                            label: 'pH',

                            data: phs,

                            borderColor: 'green',

                            backgroundColor: 'rgba(0, 128, 0, 0.10)',

                            fill: false,

                            tension: 0.3,

                            pointRadius: 3
                        },

                        {
                            label: 'Water Level (cm)',

                            data: levels,

                            borderColor: 'teal',

                            backgroundColor: 'rgba(0, 128, 128, 0.10)',

                            fill: false,

                            tension: 0.3,

                            pointRadius: 3
                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        mode: 'index',

                        intersect: false

                    },


                    plugins: {

                        legend: {

                            display: true,

                            position: 'top'

                        }

                    },


                    scales: {

                        x: {

                            title: {

                                display: true,

                                text: 'Time'

                            }

                        },


                        y: {

                            title: {

                                display: true,

                                text: 'Reading'

                            },

                            beginAtZero: false

                        }

                    }

                }

            });

        }


        // ==========================================================
        // UPDATE CHART
        // ==========================================================

        function updateChart() {

            Promise.all([

                    fetch(tempUrl)
                    .then(response => {

                        if (!response.ok) {
                            throw new Error(
                                "Temperature API error: " +
                                response.status
                            );
                        }

                        return response.json();

                    }),

                    fetch(phUrl)
                    .then(response => {

                        if (!response.ok) {
                            throw new Error(
                                "pH API error: " +
                                response.status
                            );
                        }

                        return response.json();

                    }),

                    fetch(batteryUrl)
                    .then(response => {

                        if (!response.ok) {
                            throw new Error(
                                "Battery API error: " +
                                response.status
                            );
                        }

                        return response.json();

                    }),

                    fetch(levelUrl)
                    .then(response => {

                        if (!response.ok) {
                            throw new Error(
                                "Water level API error: " +
                                response.status
                            );
                        }

                        return response.json();

                    })

                ])


                .then(([
                    tempData,
                    phData,
                    batteryData,
                    levelData
                ]) => {


                    console.log(
                        "Temperature:",
                        tempData
                    );

                    console.log(
                        "pH:",
                        phData
                    );

                    console.log(
                        "Battery:",
                        batteryData
                    );

                    console.log(
                        "Water Level:",
                        levelData
                    );


                    // ==================================================
                    // LATEST VALUES
                    // ==================================================

                    const temp =
                        getLatestValue(tempData);

                    const ph =
                        getLatestValue(phData);

                    const batteryVoltage =
                        getLatestValue(batteryData);

                    const level =
                        getLatestValue(levelData);


                    // ==================================================
                    // UPDATE TEMPERATURE CARD
                    // ==================================================

                    if (temp !== null) {

                        const element =
                            document.getElementById(
                                'latestTemp'
                            );

                        if (element) {

                            element.innerText =
                                temp.toFixed(2) + " °C";

                        }

                    }


                    // ==================================================
                    // UPDATE PH CARD
                    // ==================================================

                    if (ph !== null) {

                        const element =
                            document.getElementById(
                                'latestPh'
                            );

                        if (element) {

                            element.innerText =
                                ph.toFixed(2);

                        }

                    }


                    // ==================================================
                    // UPDATE WATER LEVEL CARD
                    // ==================================================

                    if (level !== null) {

                        const element =
                            document.getElementById(
                                'latestLevel'
                            );

                        if (element) {

                            element.innerText =
                                level.toFixed(2) + " cm";

                        }

                    }


                    // ==================================================
                    // UPDATE BATTERY
                    // ==================================================

                    if (batteryVoltage !== null) {


                        // ==================================================
                        // BATTERY PERCENTAGE
                        // 3S Lithium Battery: 8.4V - 12.6V
                        // ==================================================

                        if (batteryVoltage !== null) {

                            let batteryPercent;

                            if (batteryVoltage >= 12.6) {

                                batteryPercent = 100;

                            } else if (batteryVoltage >= 12.3) {

                                // 12.3V - 12.59V = 90-99%
                                batteryPercent =
                                    90 + ((batteryVoltage - 12.3) / 0.3) * 10;

                            } else if (batteryVoltage >= 12.0) {

                                // 12.0V - 12.29V = 70-89%
                                batteryPercent =
                                    70 + ((batteryVoltage - 12.0) / 0.3) * 20;

                            } else if (batteryVoltage >= 11.7) {

                                // 11.7V - 11.99V = 50-69%
                                batteryPercent =
                                    50 + ((batteryVoltage - 11.7) / 0.3) * 20;

                            } else if (batteryVoltage >= 11.4) {

                                // 11.4V - 11.69V = 30-49%
                                batteryPercent =
                                    30 + ((batteryVoltage - 11.4) / 0.3) * 20;

                            } else if (batteryVoltage >= 11.1) {

                                // 11.1V - 11.39V = 20-29%
                                batteryPercent =
                                    20 + ((batteryVoltage - 11.1) / 0.3) * 10;

                            } else if (batteryVoltage >= 10.8) {

                                // 10.8V - 11.09V = 10-19%
                                batteryPercent =
                                    10 + ((batteryVoltage - 10.8) / 0.3) * 10;

                            } else if (batteryVoltage >= 8.4) {

                                // 8.4V - 10.79V = 0-9%
                                batteryPercent =
                                    ((batteryVoltage - 8.4) / 2.4) * 10;

                            } else {

                                batteryPercent = 0;

                            }

                            // Keep percentage between 0 and 100
                            batteryPercent = Math.max(
                                0,
                                Math.min(100, batteryPercent)
                            );


                            // Display percentage
                            document.getElementById('latestBattery')
                                .innerText =
                                batteryPercent.toFixed(0) + "%";


                            // Display voltage
                            const voltageElement =
                                document.getElementById('batteryVoltage');

                            if (voltageElement) {

                                voltageElement.innerText =
                                    batteryVoltage.toFixed(2) + " V";

                            }
                        }

                    }


                    // ==========================================================
                    // GROUP SENSOR DATA INTO 5-MINUTE INTERVALS
                    // ==========================================================

                    function groupIntoFiveMinutes(data) {

                        const grouped = {};

                        Object.entries(data).forEach(([time, value]) => {

                            const parts = time.split('-');

                            if (parts.length !== 3) {
                                return;
                            }

                            let hour = parseInt(parts[0]);
                            let minute = parseInt(parts[1]);
                            let second = parseInt(parts[2]);

                            // Round DOWN to nearest 5 minutes
                            minute = Math.floor(minute / 5) * 5;

                            const label =
                                String(hour).padStart(2, '0') +
                                ':' +
                                String(minute).padStart(2, '0');

                            if (!grouped[label]) {
                                grouped[label] = [];
                            }

                            grouped[label].push(Number(value));

                        });

                        return grouped;
                    }


                    // ==========================================================
                    // AVERAGE VALUES IN EACH 5-MINUTE PERIOD
                    // ==========================================================

                    function averageGroupedData(grouped) {

                        const result = {};

                        Object.entries(grouped).forEach(([time, values]) => {

                            if (values.length === 0) {
                                return;
                            }

                            const sum =
                                values.reduce(
                                    (total, value) => total + value,
                                    0
                                );

                            result[time] =
                                sum / values.length;

                        });

                        return result;
                    }


                    // ==========================================================
                    // GROUP EACH SENSOR
                    // ==========================================================

                    const groupedTemp =
                        averageGroupedData(
                            groupIntoFiveMinutes(tempData)
                        );

                    const groupedPh =
                        averageGroupedData(
                            groupIntoFiveMinutes(phData)
                        );

                    const groupedLevel =
                        averageGroupedData(
                            groupIntoFiveMinutes(levelData)
                        );


                    // ==========================================================
                    // GET ALL 5-MINUTE TIME LABELS
                    // ==========================================================

                    const allTimes = new Set([

                        ...Object.keys(groupedTemp),

                        ...Object.keys(groupedPh),

                        ...Object.keys(groupedLevel)

                    ]);


                    const labels =
                        Array.from(allTimes).sort();


                    // ==========================================================
                    // PREPARE TEMPERATURE DATA
                    // ==========================================================

                    const temps = labels.map(time => {

                        return groupedTemp[time] !== undefined ?
                            groupedTemp[time] :
                            null;

                    });


                    // ==========================================================
                    // PREPARE PH DATA
                    // ==========================================================

                    const phs = labels.map(time => {

                        return groupedPh[time] !== undefined ?
                            groupedPh[time] :
                            null;

                    });


                    // ==========================================================
                    // PREPARE WATER LEVEL DATA
                    // ==========================================================

                    const levels = labels.map(time => {

                        return groupedLevel[time] !== undefined ?
                            groupedLevel[time] :
                            null;

                    });


                    // ==========================================================
                    // CREATE / UPDATE CHART
                    // ==========================================================

                    createChart(
                        labels,
                        temps,
                        phs,
                        levels
                    );

                });

        }


        // ==========================================================
        // FIRST LOAD
        // ==========================================================

        updateChart();


        // ==========================================================
        // REFRESH EVERY 10 SECONDS
        // ==========================================================

        setInterval(
            updateChart,
            10000
        );
    </script>
</x-app-layout>