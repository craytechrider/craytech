import { useEffect, useState } from "react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  CalendarDays,
  Clock3,
  Droplets,
  Battery,
  Thermometer,
  FlaskConical,
  ChevronDown,
  Zap,
} from "lucide-react";

import SensorCard from "../../components/SensorCard";
import ManualControls from "../../components/ManualControls";
import CustomerPageHero from "../../components/CustomerPageHero";

import { useCurrentSensors } from "../../hooks/useCurrentSensors";
import { useSensorHistory } from "../../hooks/useSensorHistory";

import { db } from "../../firebase";

import { onValue, ref, set } from "firebase/database";

// ============================================================
// TYPES
// ============================================================

type Timeframe = 1 | 6 | 12 | 24 | 72 | 168;

interface DeviceState {
  aerator: boolean;
  feeder: boolean;
  solenoid: boolean;
}

interface FeederCalibration {
  servoSeconds: number;
  motorSeconds: number;
}

interface SensorRange {
  min: number;
  max: number;
}

interface SensorConfig {
  temperature: SensorRange;
  ph: SensorRange;
  ammonia: SensorRange;
  batteryVoltage: SensorRange;
  current: SensorRange;
  waterLevel: SensorRange;
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_CONFIG: SensorConfig = {
  temperature: {
    min: 18,
    max: 30,
  },

  ph: {
    min: 6,
    max: 8.54,
  },

  ammonia: {
    min: 0,
    max: 0.5,
  },

  batteryVoltage: {
    min: 8.4,
    max: 12.6,
  },

  current: {
    min: 0,
    max: 8,
  },

  waterLevel: {
    min: 0,
    max: 60,
  },
};

// ============================================================
// DASHBOARD
// ============================================================

function Dashboard() {
  // ==========================================================
  // CURRENT SENSOR DATA
  // ==========================================================

  const { data, loading, error } = useCurrentSensors();

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  const [configValues, setConfigValues] =
    useState<SensorConfig>(DEFAULT_CONFIG);

  // ==========================================================
  // HISTORY TIMEFRAME
  // ==========================================================

  const [timeframe, setTimeframe] = useState<Timeframe>(1);

  // Switch between sensor trends and device controls.
  const [activeDashboardTab, setActiveDashboardTab] = useState<
    "trends" | "controls"
  >("trends");

  // ==========================================================
  // SENSOR HISTORY
  // ==========================================================

  const temperatureHistory = useSensorHistory("waterTemp", timeframe);

  const phHistory = useSensorHistory("ph", timeframe);

  const waterLevelHistory = useSensorHistory("waterLevel", timeframe);

  const ammoniaHistory = useSensorHistory("ammonia", timeframe);

  // ==========================================================
  // FIREBASE DEVICE STATES
  // ==========================================================

  const [devices, setDevices] = useState<DeviceState>({
    aerator: false,
    feeder: false,
    solenoid: false,
  });

  // ==========================================================
  // FEEDER CALIBRATION
  // ==========================================================

  const [feederCalibration, setFeederCalibration] = useState<FeederCalibration>(
    {
      servoSeconds: 1.5,
      motorSeconds: 3.0,
    },
  );

  // ==========================================================
  // FIREBASE CONFIGURATION LISTENER
  // ==========================================================

  useEffect(() => {
    const configRef = ref(db, "settings/configuration");

    const unsubscribe = onValue(
      configRef,
      (snapshot) => {
        const config = snapshot.val();

        if (!config) {
          return;
        }

        setConfigValues((current) => ({
          temperature: {
            min: Number.isFinite(Number(config.temperature?.min))
              ? Number(config.temperature.min)
              : current.temperature.min,

            max: Number.isFinite(Number(config.temperature?.max))
              ? Number(config.temperature.max)
              : current.temperature.max,
          },

          ph: {
            min: Number.isFinite(Number(config.ph?.min))
              ? Number(config.ph.min)
              : current.ph.min,

            max: Number.isFinite(Number(config.ph?.max))
              ? Number(config.ph.max)
              : current.ph.max,
          },

          ammonia: {
            min: Number.isFinite(Number(config.ammonia?.min))
              ? Number(config.ammonia.min)
              : current.ammonia.min,

            max: Number.isFinite(Number(config.ammonia?.max))
              ? Number(config.ammonia.max)
              : current.ammonia.max,
          },

          batteryVoltage: {
            min: Number.isFinite(Number(config.batteryVoltage?.min))
              ? Number(config.batteryVoltage.min)
              : current.batteryVoltage.min,

            max: Number.isFinite(Number(config.batteryVoltage?.max))
              ? Number(config.batteryVoltage.max)
              : current.batteryVoltage.max,
          },

          current: {
            min: Number.isFinite(Number(config.current?.min))
              ? Number(config.current.min)
              : current.current.min,

            max: Number.isFinite(Number(config.current?.max))
              ? Number(config.current.max)
              : current.current.max,
          },

          waterLevel: {
            min: Number.isFinite(Number(config.waterLevel?.min))
              ? Number(config.waterLevel.min)
              : current.waterLevel.min,

            max: Number.isFinite(Number(config.waterLevel?.max))
              ? Number(config.waterLevel.max)
              : current.waterLevel.max,
          },
        }));
      },
      (firebaseError) => {
        console.error("Failed to read sensor configuration:", firebaseError);
      },
    );

    return () => unsubscribe();
  }, []);

  // ==========================================================
  // FIREBASE REAL-TIME DEVICE LISTENERS
  // ==========================================================

  useEffect(() => {
    const aeratorRef = ref(db, "devices/aerator/isOn");

    const feederRef = ref(db, "devices/feeder/isOn");

    const solenoidRef = ref(db, "devices/solenoid/isOn");

    const unsubscribeAerator = onValue(aeratorRef, (snapshot) => {
      const value = snapshot.val();

      setDevices((previous) => ({
        ...previous,
        aerator: value === true,
      }));
    });

    const unsubscribeFeeder = onValue(feederRef, (snapshot) => {
      const value = snapshot.val();

      setDevices((previous) => ({
        ...previous,
        feeder: value === true,
      }));
    });

    const unsubscribeSolenoid = onValue(solenoidRef, (snapshot) => {
      const value = snapshot.val();

      setDevices((previous) => ({
        ...previous,
        solenoid: value === true,
      }));
    });

    return () => {
      unsubscribeAerator();
      unsubscribeFeeder();
      unsubscribeSolenoid();
    };
  }, []);

  // ==========================================================
  // FIREBASE FEEDER CALIBRATION LISTENER
  // ==========================================================

  useEffect(() => {
    const feederCalibrationRef = ref(db, "settings/calibration/feeder");

    const unsubscribe = onValue(
      feederCalibrationRef,
      (snapshot) => {
        const calibration = snapshot.val();

        if (!calibration) {
          return;
        }

        setFeederCalibration((current) => ({
          servoSeconds: Number.isFinite(Number(calibration.servoSeconds))
            ? Number(calibration.servoSeconds)
            : current.servoSeconds,

          motorSeconds: Number.isFinite(Number(calibration.motorSeconds))
            ? Number(calibration.motorSeconds)
            : current.motorSeconds,
        }));
      },
      (firebaseError) => {
        console.error("Failed to read feeder calibration:", firebaseError);
      },
    );

    return () => unsubscribe();
  }, []);

  // ==========================================================
  // SENSOR STATUS
  // ==========================================================

  const temperatureStatus =
    data.waterTemp !== null && data.waterTemp !== undefined
      ? getConfiguredStatus(
          data.waterTemp,
          configValues.temperature,
          "temperature",
        )
      : "Waiting for sensor...";

  const phStatus =
    data.ph !== null && data.ph !== undefined
      ? getConfiguredStatus(data.ph, configValues.ph, "ph")
      : "Waiting for sensor...";

  const ammoniaStatus =
    data.ammonia !== null && data.ammonia !== undefined
      ? getConfiguredStatus(data.ammonia, configValues.ammonia, "ammonia")
      : "Waiting for sensor...";

  const waterLevelStatus =
    data.waterLevel !== null && data.waterLevel !== undefined
      ? getConfiguredStatus(
          data.waterLevel,
          configValues.waterLevel,
          "waterLevel",
        )
      : "Waiting for sensor...";

  const batteryStatus =
    data.batteryVoltage !== null && data.batteryVoltage !== undefined
      ? getConfiguredStatus(
          data.batteryVoltage,
          configValues.batteryVoltage,
          "battery",
        )
      : "Waiting for sensor...";

  // ==========================================================
  // BATTERY PERCENTAGE
  // ==========================================================

  const batteryPercentage =
    data.batteryVoltage !== null && data.batteryVoltage !== undefined
      ? getBatteryPercentage(data.batteryVoltage)
      : null;

  // ==========================================================
  // CHART DATA
  // ==========================================================

  const chartPoints = new Map<
    number,
    {
      timestamp: number;
      temperature?: number;
      ph?: number;
      waterLevel?: number;
      ammonia?: number;
    }
  >();

  // ----------------------------------------------------------
  // TEMPERATURE
  // ----------------------------------------------------------

  temperatureHistory.data.forEach((point) => {
    chartPoints.set(point.timestamp, {
      ...chartPoints.get(point.timestamp),

      timestamp: point.timestamp,

      temperature: point.value,
    });
  });

  // ----------------------------------------------------------
  // PH
  // ----------------------------------------------------------

  phHistory.data.forEach((point) => {
    chartPoints.set(point.timestamp, {
      ...chartPoints.get(point.timestamp),

      timestamp: point.timestamp,

      ph: point.value,
    });
  });

  // ----------------------------------------------------------
  // WATER LEVEL
  // ----------------------------------------------------------

  waterLevelHistory.data.forEach((point) => {
    chartPoints.set(point.timestamp, {
      ...chartPoints.get(point.timestamp),

      timestamp: point.timestamp,

      waterLevel: point.value,
    });
  });

  // ----------------------------------------------------------
  // AMMONIA
  // ----------------------------------------------------------

  ammoniaHistory.data.forEach((point) => {
    chartPoints.set(point.timestamp, {
      ...chartPoints.get(point.timestamp),

      timestamp: point.timestamp,

      ammonia: point.value,
    });
  });

  // ----------------------------------------------------------
  // FINAL CHART ARRAY
  // ----------------------------------------------------------

  const chartData = Array.from(chartPoints.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((point) => ({
      ...point,

      time: formatChartTime(point.timestamp, timeframe),
    }));

  // ==========================================================
  // FIREBASE DEVICE CONTROL
  // ==========================================================

  // ----------------------------------------------------------
  // SOLENOID
  // ----------------------------------------------------------

  const handleRefillChange = async (enabled: boolean) => {
    try {
      const solenoidRef = ref(db, "devices/solenoid/isOn");

      await set(solenoidRef, enabled);

      console.log("Solenoid:", enabled ? "ON" : "OFF");
    } catch (firebaseError) {
      console.error("Failed to update solenoid:", firebaseError);
    }
  };

  // ----------------------------------------------------------
  // FEEDER
  // ----------------------------------------------------------

  const handleFeederChange = async (enabled: boolean) => {
    try {
      const feederRef = ref(db, "devices/feeder/isOn");

      /*
       * The Dashboard only sends the feeder command.
       *
       * The ESP32 owns the complete physical feeder cycle:
       *
       * servo open
       * -> servo close
       * -> COM1 motor
       * -> motor off
       *
       * After the physical cycle finishes,
       * the ESP32 writes:
       *
       * /devices/feeder/isOn = false
       *
       * back to Firebase.
       *
       * IMPORTANT:
       * There is intentionally NO JavaScript setTimeout()
       * here. Network latency must never cause the Dashboard
       * to finish the feeder cycle early.
       */

      await set(feederRef, enabled);

      console.log("Feeder command:", enabled ? "START" : "STOP");
    } catch (firebaseError) {
      console.error("Failed to update feeder:", firebaseError);
    }
  };

  // ----------------------------------------------------------
  // AERATOR
  // ----------------------------------------------------------

  const handleAeratorChange = async (enabled: boolean) => {
    try {
      const aeratorRef = ref(db, "devices/aerator/isOn");

      await set(aeratorRef, enabled);

      console.log("Aerator:", enabled ? "ON" : "OFF");
    } catch (firebaseError) {
      console.error("Failed to update aerator:", firebaseError);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-5">
        <div className="text-center">
          <div
            className="
              mx-auto
              mb-4
              h-9
              w-9
              animate-spin
              rounded-full
              border-4
              border-blue-100
              border-t-blue-600
            "
          />

          <p className="text-sm font-medium text-gray-500">
            Loading sensor data...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div
          className="
            mx-auto
            w-full
            max-w-[1450px]
            rounded-xl
            border
            border-red-200
            bg-red-50
            p-5
            text-sm
            font-medium
            text-red-600
            sm:p-6
          "
        >
          {error}
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        w-full
        px-4
        pb-10
        pt-5
        sm:px-6
        sm:pt-6
        lg:px-8
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1450px]
        "
      >
        {/* ==================================================
            HERO
        ================================================== */}

        <div className="mb-3 sm:mb-4">
          <CustomerPageHero
            section="FARM MANAGEMENT SYSTEM"
            title="Farm Overview"
            description="Monitor your crayfish farm water conditions, sensor readings, equipment status, and system activity in one place."
            type="dashboard"
          />
        </div>

        {/* STICKY DATE: stays visible while scrolling the dashboard */}
        <div
          className="
            sticky
            top-16
            z-30
            -mx-4
            mb-4
            flex
            w-auto
            justify-start
            border-b
            border-[#e4eaf2]
            bg-[#F7F9FC]/95
            px-4
            py-2
            backdrop-blur-md
            sm:-mx-6
            sm:px-6
            lg:-mx-8
            lg:px-8
          "
        >
          <div
            className="
              flex
              w-full
              items-center
              gap-3
              rounded-xl
              border
              border-[#dce3ec]
              bg-white
              px-4
              py-2.5
              shadow-sm
              sm:w-auto
              sm:px-5
            "
          >
            <CalendarDays size={18} className="shrink-0 text-[#1749D1]" />

            <span className="text-sm font-semibold text-[#1749D1] sm:text-base">
              {data.date || getTodayDate()}
            </span>
          </div>
        </div>

        {/* ==================================================
            SENSOR CARDS
        ================================================== */}

        <div
          className="
            mt-5
            grid
            grid-cols-3
            gap-2
            sm:gap-3
          "
        >
          <SensorDashboardCard
            title="Water Temperature"
            value={
              data.waterTemp !== null && data.waterTemp !== undefined
                ? data.waterTemp.toFixed(1)
                : "--"
            }
            unit="°C"
            icon={<Thermometer size={15} />}
            status={temperatureStatus}
            iconClass="bg-blue-100 text-[#1749D1]"
            cardClass="border-blue-200 bg-blue-50/20"
            valueClass="text-[#102D79]"
          />

          <SensorDashboardCard
            title="pH Level"
            value={
              data.ph !== null && data.ph !== undefined
                ? data.ph.toFixed(2)
                : "--"
            }
            unit="pH"
            icon={<span className="text-[10px] font-extrabold">pH</span>}
            status={phStatus}
            iconClass="bg-orange-100 text-orange-600"
            cardClass="border-orange-200 bg-orange-50/20"
            valueClass="text-[#102D79]"
          />

          <SensorDashboardCard
            title="Water Level"
            value={
              data.waterLevel !== null && data.waterLevel !== undefined
                ? data.waterLevel.toFixed(1)
                : "--"
            }
            unit="cm"
            icon={<Droplets size={15} />}
            status={waterLevelStatus}
            iconClass="bg-blue-100 text-[#1749D1]"
            cardClass="border-blue-200 bg-blue-50/20"
            valueClass="text-[#102D79]"
          />

          <SensorDashboardCard
            title="Battery"
            value={
              batteryPercentage !== null ? batteryPercentage.toFixed(0) : "--"
            }
            unit="%"
            icon={<Battery size={15} />}
            status={batteryStatus}
            iconClass="bg-orange-100 text-orange-600"
            cardClass="border-orange-200 bg-orange-50/20"
            valueClass="text-[#102D79]"
          />

          <SensorDashboardCard
            title="Ammonia"
            value={
              data.ammonia !== null && data.ammonia !== undefined
                ? data.ammonia.toFixed(2)
                : "--"
            }
            unit="mg/L"
            icon={<FlaskConical size={15} />}
            status={ammoniaStatus}
            iconClass="bg-blue-100 text-[#1749D1]"
            cardClass="border-blue-200 bg-blue-50/20"
            valueClass="text-[#102D79]"
          />

          <SensorDashboardCard
            title="Current"
            value={
              data.current !== null && data.current !== undefined
                ? data.current.toFixed(2)
                : "--"
            }
            unit="A"
            icon={<Zap size={15} />}
            status={
              data.current !== null && data.current !== undefined
                ? getConfiguredStatus(
                    data.current,
                    configValues.current,
                    "current",
                  )
                : "Waiting for sensor..."
            }
            iconClass="bg-orange-100 text-orange-600"
            cardClass="border-orange-200 bg-orange-50/20"
            valueClass="text-[#102D79]"
          />
        </div>

        {/* ==================================================
            DASHBOARD TABS: TRENDS / CONTROLS
        ================================================== */}

        <section className="mt-6">
          <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#dce3ec] bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveDashboardTab("trends")}
              aria-pressed={activeDashboardTab === "trends"}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                activeDashboardTab === "trends"
                  ? "bg-[#17365D] text-white shadow-sm"
                  : "text-[#52647f] hover:bg-blue-50 hover:text-[#17365D]"
              }`}
            >
              Sensor Trends
            </button>
            <button
              type="button"
              onClick={() => setActiveDashboardTab("controls")}
              aria-pressed={activeDashboardTab === "controls"}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                activeDashboardTab === "controls"
                  ? "bg-[#17365D] text-white shadow-sm"
                  : "text-[#52647f] hover:bg-blue-50 hover:text-[#17365D]"
              }`}
            >
              Device Controls
            </button>
          </div>

          {activeDashboardTab === "trends" ? (
            <div className="min-w-0">
              <div
                className="
              min-w-0
              overflow-hidden
              rounded-2xl
              border
              border-[#e4e8ee]
              bg-white
              shadow-sm
            "
              >
                {/* GRAPH HEADER */}

                <div
                  className="
                flex
                flex-col
                gap-4
                px-4
                pb-3
                pt-5
                sm:px-6
                sm:pt-6
                md:flex-row
                md:items-center
                md:justify-between
              "
                >
                  <div className="min-w-0">
                    <h2
                      className="
                    text-lg
                    font-bold
                    text-[#102a56]
                    sm:text-[21px]
                  "
                    >
                      Water Quality & Level Trends
                    </h2>

                    <p
                      className="
                    mt-1
                    text-xs
                    text-[#73839c]
                    sm:text-sm
                  "
                    >
                      Historical sensor readings
                    </p>
                  </div>

                  {/* TIMEFRAME */}

                  <div
                    className="
                  flex
                  w-full
                  shrink-0
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-[#dce3ec]
                  bg-white
                  px-3
                  py-2.5
                  sm:w-auto
                  sm:gap-3
                  sm:px-4
                  sm:py-3
                "
                  >
                    <Clock3 size={18} className="shrink-0 text-[#102a56]" />

                    <select
                      value={timeframe}
                      onChange={(event) =>
                        setTimeframe(Number(event.target.value) as Timeframe)
                      }
                      className="
                    min-w-0
                    flex-1
                    cursor-pointer
                    appearance-none
                    bg-transparent
                    pr-5
                    text-sm
                    font-medium
                    text-[#243957]
                    outline-none
                    sm:text-base
                  "
                    >
                      <option value={1}>Last 1 Hour</option>

                      <option value={6}>Last 6 Hours</option>

                      <option value={12}>Last 12 Hours</option>

                      <option value={24}>Today</option>

                      <option value={72}>Last 3 Days</option>

                      <option value={168}>Last 7 Days</option>
                    </select>

                    <ChevronDown
                      size={16}
                      className="
                    pointer-events-none
                    -ml-6
                    shrink-0
                    text-gray-500
                  "
                    />
                  </div>
                </div>

                {/* GRAPH */}

                <div
                  className="
                px-2
                pb-5
                pt-1
                sm:px-5
                sm:pb-7
              "
                >
                  {/* CUSTOM LEGEND */}

                  <div
                    className="
                  mb-4
                  w-full
                  overflow-hidden
                  rounded-2xl
                  border
                  border-blue-100
                  bg-blue-50/50
                  p-3
                  sm:p-4
                "
                  >
                    <div
                      className="
                    grid
                    grid-cols-2
                    gap-x-3
                    gap-y-2
                    sm:flex
                    sm:flex-wrap
                    sm:gap-x-5
                    sm:gap-y-2
                  "
                    >
                      <ChartLegendItem
                        color="bg-[#1749D1]"
                        textColor="text-[#1749D1]"
                        label="Water Temperature"
                      />

                      <ChartLegendItem
                        color="bg-orange-500"
                        textColor="text-orange-600"
                        label="pH Level"
                      />

                      <ChartLegendItem
                        color="bg-[#102D79]"
                        textColor="text-[#102D79]"
                        label="Water Level"
                      />

                      <ChartLegendItem
                        color="bg-green-500"
                        textColor="text-green-600"
                        label="Ammonia"
                      />
                    </div>
                  </div>

                  {/* RESPONSIVE CHART */}

                  <div
                    className="
                  h-[250px]
                  w-full
                  min-w-0
                  sm:h-[320px]
                  lg:h-[400px]
                "
                  >
                    {temperatureHistory.loading ||
                    phHistory.loading ||
                    waterLevelHistory.loading ||
                    ammoniaHistory.loading ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                          <div
                            className="
                          mx-auto
                          mb-4
                          h-9
                          w-9
                          animate-spin
                          rounded-full
                          border-4
                          border-blue-100
                          border-t-[#1749D1]
                        "
                          />

                          <p className="text-sm text-gray-500">
                            Loading historical readings...
                          </p>
                        </div>
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="flex h-full items-center justify-center px-5">
                        <div className="text-center">
                          <p className="font-medium text-gray-500">
                            No historical readings available
                          </p>

                          <p className="mt-1 text-sm text-gray-400">
                            Sensor history will appear here once readings are
                            recorded.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{
                            top: 5,
                            right: 5,
                            left: -10,
                            bottom: 5,
                          }}
                        >
                          <defs>
                            {/* TEMPERATURE GRADIENT */}

                            <linearGradient
                              id="craytechTemperatureGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#1749D1"
                                stopOpacity={0.22}
                              />

                              <stop
                                offset="95%"
                                stopColor="#1749D1"
                                stopOpacity={0}
                              />
                            </linearGradient>

                            {/* PH GRADIENT */}

                            <linearGradient
                              id="craytechPHGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#F59E0B"
                                stopOpacity={0.22}
                              />

                              <stop
                                offset="95%"
                                stopColor="#F59E0B"
                                stopOpacity={0}
                              />
                            </linearGradient>

                            {/* WATER LEVEL GRADIENT */}

                            <linearGradient
                              id="craytechWaterGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#102D79"
                                stopOpacity={0.22}
                              />

                              <stop
                                offset="95%"
                                stopColor="#102D79"
                                stopOpacity={0}
                              />
                            </linearGradient>

                            {/* AMMONIA GRADIENT */}

                            <linearGradient
                              id="craytechAmmoniaGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#22C55E"
                                stopOpacity={0.18}
                              />

                              <stop
                                offset="95%"
                                stopColor="#22C55E"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e8edf5"
                          />

                          <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 9,
                              fill: "#7b8aa3",
                              fontWeight: 500,
                            }}
                            dy={8}
                            interval="preserveStartEnd"
                          />

                          {/* MAIN Y AXIS */}

                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            width={32}
                            tick={{
                              fontSize: 9,
                              fill: "#7b8aa3",
                              fontWeight: 500,
                            }}
                          />

                          {/* AMMONIA Y AXIS */}

                          <YAxis
                            yAxisId="ammonia"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            width={42}
                            domain={[0, "auto"]}
                            tick={{
                              fontSize: 9,
                              fill: "#22C55E",
                              fontWeight: 500,
                            }}
                            tickFormatter={(value: number) => value.toFixed(2)}
                          />

                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255,255,255,0.98)",
                              borderRadius: "12px",
                              border: "1px solid #dce3ec",
                              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.10)",
                              fontSize: "11px",
                            }}
                            labelStyle={{
                              color: "#102D79",
                              marginBottom: "8px",
                              fontWeight: 600,
                            }}
                          />

                          {/* WATER TEMPERATURE */}

                          <Area
                            type="monotone"
                            dataKey="temperature"
                            name="Water Temperature"
                            stroke="#1749D1"
                            strokeWidth={2.5}
                            fill="url(#craytechTemperatureGradient)"
                            fillOpacity={1}
                            dot={false}
                            activeDot={{ r: 4 }}
                            connectNulls
                          />

                          {/* PH */}

                          <Area
                            type="monotone"
                            dataKey="ph"
                            name="pH Level"
                            stroke="#F59E0B"
                            strokeWidth={2.5}
                            fill="url(#craytechPHGradient)"
                            fillOpacity={1}
                            dot={false}
                            activeDot={{ r: 4 }}
                            connectNulls
                          />

                          {/* WATER LEVEL */}

                          <Area
                            type="monotone"
                            dataKey="waterLevel"
                            name="Water Level"
                            stroke="#102D79"
                            strokeWidth={2.5}
                            fill="url(#craytechWaterGradient)"
                            fillOpacity={1}
                            dot={false}
                            activeDot={{ r: 4 }}
                            connectNulls
                          />

                          {/* AMMONIA */}

                          <Area
                            type="monotone"
                            dataKey="ammonia"
                            name="Ammonia"
                            yAxisId="ammonia"
                            stroke="#22C55E"
                            strokeWidth={2.5}
                            fill="url(#craytechAmmoniaGradient)"
                            fillOpacity={1}
                            dot={false}
                            activeDot={{ r: 4 }}
                            connectNulls
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-w-0 rounded-2xl border border-[#e4e8ee] bg-white p-3 shadow-sm sm:p-5">
              <ManualControls
                refillOn={devices.solenoid}
                feederOn={devices.feeder}
                aeratorOn={devices.aerator}
                onRefillChange={handleRefillChange}
                onFeederChange={handleFeederChange}
                onAeratorChange={handleAeratorChange}
              />
            </div>
          )}
        </section>

        {/* ==================================================
            LAST UPDATED
        ================================================== */}

        <div
          className="
            mt-5
            px-1
            text-xs
            text-gray-400
            sm:text-sm
          "
        >
          Last updated:{" "}
          {data.date && data.time
            ? `${data.date} ${data.time}`
            : "Waiting for sensor..."}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CRAYTECH SENSOR DASHBOARD CARD
// ============================================================

interface SensorDashboardCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  status: string;
  iconClass: string;
  cardClass: string;
  valueClass: string;
}

function SensorDashboardCard({
  title,
  value,
  unit,
  icon,
  status,
  iconClass,
  cardClass,
  valueClass,
}: SensorDashboardCardProps) {
  const isWarning = status === "High" || status === "Low";

  return (
    <div
      className={`
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        px-2.5
        py-3
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
        sm:px-4
        sm:py-4
        lg:px-5
        lg:py-5
        ${cardClass}
      `}
    >
      {/* CARD HEADER */}

      <div
        className="
          flex
          min-w-0
          items-start
          justify-between
          gap-1.5
        "
      >
        <h3
          className="
            min-w-0
            flex-1
            truncate
            pr-1
            text-[9px]
            font-semibold
            leading-tight
            text-[#405474]
            sm:text-xs
            lg:text-sm
          "
        >
          {title}
        </h3>

        <div
          className={`
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-lg
            sm:h-9
            sm:w-9
            sm:rounded-xl
            lg:h-10
            lg:w-10
            ${iconClass}
          `}
        >
          {icon}
        </div>
      </div>

      {/* VALUE */}

      <div
        className="
          mt-2
          flex
          min-w-0
          items-baseline
          gap-0.5
          sm:mt-3
          sm:gap-1
        "
      >
        <span
          className={`
            min-w-0
            truncate
            text-[17px]
            font-bold
            tracking-tight
            sm:text-2xl
            lg:text-3xl
            ${valueClass}
          `}
        >
          {value}
        </span>

        <span
          className="
            shrink-0
            text-[8px]
            font-medium
            text-[#8a98ad]
            sm:text-xs
          "
        >
          {unit}
        </span>
      </div>

      {/* STATUS */}

      <div className="mt-1.5 sm:mt-2">
        <span
          className={`
            inline-flex
            max-w-full
            items-center
            gap-1
            rounded-md
            border
            bg-white/80
            px-1.5
            py-0.5
            text-[7px]
            font-semibold
            shadow-sm
            sm:rounded-lg
            sm:px-2
            sm:py-1
            sm:text-[10px]
            ${
              isWarning
                ? "border-orange-200 text-orange-600"
                : "border-blue-100 text-[#1749D1]"
            }
          `}
        >
          <span
            className={`
              h-1.5
              w-1.5
              shrink-0
              rounded-full
              sm:h-2
              sm:w-2
              ${isWarning ? "bg-orange-500" : "bg-[#1749D1]"}
            `}
          />

          <span className="truncate">{status}</span>
        </span>
      </div>
    </div>
  );
}

// ============================================================
// CHART LEGEND ITEM
// ============================================================

interface ChartLegendItemProps {
  color: string;
  textColor: string;
  label: string;
}

function ChartLegendItem({ color, textColor, label }: ChartLegendItemProps) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        className={`
          h-2.5
          w-2.5
          shrink-0
          rounded-full
          ${color}
        `}
      />

      <span
        className={`
          truncate
          text-[10px]
          font-semibold
          sm:text-xs
          ${textColor}
        `}
      >
        {label}
      </span>
    </div>
  );
}

// ============================================================
// DEVICE STATUS
// ============================================================

interface DeviceStatusProps {
  name: string;
  icon: React.ReactNode;
  isOn: boolean;
}

function DeviceStatus({ name, icon, isOn }: DeviceStatusProps) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        rounded-lg
        border
        border-[#e5e9ef]
        bg-[#f8fafc]
        px-4
        py-3
      "
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-lg
            ${
              isOn ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            }
          `}
        >
          {icon}
        </div>

        <span
          className="
            text-sm
            font-medium
            text-[#405474]
          "
        >
          {name}
        </span>
      </div>

      <span
        className={`
          rounded-full
          px-3
          py-1
          text-xs
          font-bold
          ${isOn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
        `}
      >
        {isOn ? "ON" : "OFF"}
      </span>
    </div>
  );
}

// ============================================================
// CONFIGURED SENSOR STATUS
// ============================================================

function getConfiguredStatus(
  value: number,
  range: SensorRange,
  sensorType:
    | "temperature"
    | "ph"
    | "ammonia"
    | "battery"
    | "waterLevel"
    | "current",
): string {
  if (value < range.min) {
    if (
      sensorType === "temperature" ||
      sensorType === "ph" ||
      sensorType === "waterLevel"
    ) {
      return "Low";
    }

    return "Low";
  }

  if (value > range.max) {
    if (
      sensorType === "temperature" ||
      sensorType === "ph" ||
      sensorType === "ammonia" ||
      sensorType === "battery" ||
      sensorType === "waterLevel"
    ) {
      return "High";
    }

    return "High";
  }

  return "Normal";
}

// ============================================================
// STABLE BATTERY PERCENTAGE
// ============================================================
//
// Battery range:
//
// 8.4 V  = 0%
// 12.6 V = 100%
//
// Latest five voltage readings are averaged first.
// Result is rounded to nearest 5%.
//
// ============================================================

const batteryVoltageSamples: number[] = [];

function getBatteryPercentage(voltage: number): number {
  if (!Number.isFinite(voltage)) {
    return 0;
  }

  batteryVoltageSamples.push(voltage);

  // Keep only the latest five readings.

  if (batteryVoltageSamples.length > 5) {
    batteryVoltageSamples.shift();
  }

  const averageVoltage =
    batteryVoltageSamples.reduce((sum, value) => sum + value, 0) /
    batteryVoltageSamples.length;

  const minVoltage = 8.4;
  const maxVoltage = 12.6;

  const percentage =
    ((averageVoltage - minVoltage) / (maxVoltage - minVoltage)) * 100;

  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Display only in 5% steps.

  return Math.round(clampedPercentage / 5) * 5;
}

// ============================================================
// CHART TIME
// ============================================================

function formatChartTime(timestamp: number, timeframe: Timeframe): string {
  const date = new Date(timestamp);

  if (timeframe <= 24) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

// ============================================================
// TODAY'S DATE
// ============================================================

function getTodayDate(): string {
  const now = new Date();

  return now.toISOString().split("T")[0];
}

// ============================================================
// EXPORT
// ============================================================

export default Dashboard;
