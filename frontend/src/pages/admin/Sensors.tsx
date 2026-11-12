import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  Battery,
  CheckCircle2,
  Clock3,
  Droplets,
  Gauge,
  Loader2,
  RefreshCw,
  Save,
  Plus,
  Thermometer,
  Waves,
  Zap,
  X,
} from "lucide-react";

import { onValue, ref, set, update } from "firebase/database";
import { db } from "../../firebase";
import { useCurrentSensors } from "../../hooks/useCurrentSensors";

// ============================================================
// TYPES
// ============================================================

interface SensorData {
  waterTemp: number | null;
  ph: number | null;
  phVoltage: number | null;
  ammonia: number | null;
  batteryVoltage: number | null;
  current: number | null;
  waterLevel: number | null;
  waterPercent: number | null;
  distance: number | null;
  date: string;
  time: string;
  dateTime: string;
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

interface PHCalibration {
  ph4Voltage: number | null;
  ph7Voltage: number | null;
  ph10Voltage: number | null;

  // Kept for compatibility with existing CRAYTECH firmware/code
  slope: number | null;
  intercept: number | null;

  calibratedAt: string | null;
}

interface WaterLevelCalibration {
  tankDepth: number;
  distanceOffset: number;
}

interface FeederCalibration {
  servoSeconds: number;
  motorSeconds: number;
}

// ============================================================
// DEFAULTS
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

const DEFAULT_PH_CALIBRATION: PHCalibration = {
  ph4Voltage: null,
  ph7Voltage: null,
  ph10Voltage: null,

  slope: null,
  intercept: null,

  calibratedAt: null,
};

const DEFAULT_WATER_CALIBRATION: WaterLevelCalibration = {
  tankDepth: 60,
  distanceOffset: 0,
};

const DEFAULT_FEEDER_CALIBRATION: FeederCalibration = {
  servoSeconds: 1.5,
  motorSeconds: 3,
};

// ============================================================
// HELPERS
// ============================================================

const numberValue = (
  value: unknown,
  fallback: number | null = null,
): number | null => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatNumber = (value: number | null, decimals = 2) => {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return value.toFixed(decimals);
};

// ============================================================
// COMPONENT
// ============================================================

export default function Sensors() {
  const [sensorData, setSensorData] = useState<SensorData>({
    waterTemp: null,
    ph: null,
    phVoltage: null,
    ammonia: null,
    batteryVoltage: null,
    current: null,
    waterLevel: null,
    waterPercent: null,
    distance: null,
    date: "",
    time: "",
    dateTime: "",
  });

  // ==========================================================
  // STABLE BATTERY PERCENTAGE
  // ==========================================================
  //
  // Battery range:
  //   8.4 V  = 0%
  //   12.6 V = 100%
  //
  // The latest 5 voltage readings are averaged before the
  // percentage is calculated. The displayed percentage is then
  // rounded to the nearest 5% to prevent second-to-second jumps.
  // ==========================================================

  const batteryVoltageSamplesRef = useRef<number[]>([]);

  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);

  const [configValues, setConfigValues] =
    useState<SensorConfig>(DEFAULT_CONFIG);

  const [phCalibration, setPHCalibration] = useState<PHCalibration>(
    DEFAULT_PH_CALIBRATION,
  );

  const [waterCalibration, setWaterCalibration] =
    useState<WaterLevelCalibration>(DEFAULT_WATER_CALIBRATION);

  const [feederCalibration, setFeederCalibration] = useState<FeederCalibration>(
    DEFAULT_FEEDER_CALIBRATION,
  );

  const [showConfiguration, setShowConfiguration] = useState(false);

  const [showCalibration, setShowCalibration] = useState(false);

  const [showAddMenu, setShowAddMenu] = useState(false);

  const [calibrationTab, setCalibrationTab] = useState<
    "ph" | "water" | "servo" | "motor"
  >("ph");

  const [savingConfig, setSavingConfig] = useState(false);

  const [savingCalibration, setSavingCalibration] = useState(false);

  // ==========================================================
  // pH CALIBRATION SAVING STATES
  // ==========================================================

  const [savingPH4, setSavingPH4] = useState(false);

  const [savingPH7, setSavingPH7] = useState(false);

  const [savingPH10, setSavingPH10] = useState(false);

  const [phMessage, setPHMessage] = useState("");

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ==========================================================
  // LIVE SENSOR DATA
  // ==========================================================
  // Uses the same /current listener as the Dashboard.
  // Historical readings remain under /sensors/.
  // ==========================================================

  const { data: currentSensorData } = useCurrentSensors();

  useEffect(() => {
    setSensorData({
      waterTemp: currentSensorData.waterTemp,
      ph: currentSensorData.ph,
      phVoltage: currentSensorData.phVoltage,
      ammonia: currentSensorData.ammonia,
      batteryVoltage: currentSensorData.batteryVoltage,
      current: currentSensorData.current,
      waterLevel: currentSensorData.waterLevel,
      waterPercent: currentSensorData.waterPercent,
      distance: currentSensorData.distance,
      date: currentSensorData.date,
      time: currentSensorData.time,
      dateTime: currentSensorData.dateTime,
    });

    if (
      currentSensorData.dateTime ||
      currentSensorData.date ||
      currentSensorData.time
    ) {
      setLastUpdated(new Date());
    }
  }, [currentSensorData]);

  // ==========================================================
  // BATTERY PERCENTAGE
  // ==========================================================

  useEffect(() => {
    const voltage = currentSensorData.batteryVoltage;

    if (voltage === null || !Number.isFinite(voltage)) {
      setBatteryPercent(null);
      return;
    }

    const samples = batteryVoltageSamplesRef.current;

    samples.push(voltage);

    // Keep only the newest 5 readings.
    if (samples.length > 5) {
      samples.shift();
    }

    const averageVoltage =
      samples.reduce((sum, value) => sum + value, 0) / samples.length;

    const MIN_VOLTAGE = 8.4;
    const MAX_VOLTAGE = 12.6;

    const rawPercent =
      ((averageVoltage - MIN_VOLTAGE) / (MAX_VOLTAGE - MIN_VOLTAGE)) * 100;

    const clampedPercent = Math.max(0, Math.min(100, rawPercent));

    // Show only 0, 5, 10, 15 ... 100%.
    const roundedPercent = Math.round(clampedPercent / 5) * 5;

    setBatteryPercent(roundedPercent);
  }, [currentSensorData.batteryVoltage]);

  // ==========================================================
  // FIREBASE CONFIGURATION
  // ==========================================================

  useEffect(() => {
    const configRef = ref(db, "/settings/configuration");

    return onValue(configRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        return;
      }

      setConfigValues((current) => ({
        temperature: {
          min:
            numberValue(data.temperature?.min, current.temperature.min) ??
            current.temperature.min,

          max:
            numberValue(data.temperature?.max, current.temperature.max) ??
            current.temperature.max,
        },

        ph: {
          min: numberValue(data.ph?.min, current.ph.min) ?? current.ph.min,

          max: numberValue(data.ph?.max, current.ph.max) ?? current.ph.max,
        },

        ammonia: {
          min:
            numberValue(data.ammonia?.min, current.ammonia.min) ??
            current.ammonia.min,

          max:
            numberValue(data.ammonia?.max, current.ammonia.max) ??
            current.ammonia.max,
        },

        batteryVoltage: {
          min:
            numberValue(data.batteryVoltage?.min, current.batteryVoltage.min) ??
            current.batteryVoltage.min,

          max:
            numberValue(data.batteryVoltage?.max, current.batteryVoltage.max) ??
            current.batteryVoltage.max,
        },

        current: {
          min:
            numberValue(data.current?.min, current.current.min) ??
            current.current.min,

          max:
            numberValue(data.current?.max, current.current.max) ??
            current.current.max,
        },

        waterLevel: {
          min:
            numberValue(data.waterLevel?.min, current.waterLevel.min) ??
            current.waterLevel.min,

          max:
            numberValue(data.waterLevel?.max, current.waterLevel.max) ??
            current.waterLevel.max,
        },
      }));
    });
  }, []);

  // ==========================================================
  // FIREBASE CALIBRATION DATA
  // ==========================================================

  useEffect(() => {
    const calibrationRef = ref(db, "/settings/calibration");

    return onValue(calibrationRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        return;
      }

      // ======================================================
      // pH CALIBRATION
      // ======================================================

      setPHCalibration((current) => ({
        ph4Voltage: numberValue(data.ph?.ph4Voltage, current.ph4Voltage),

        ph7Voltage: numberValue(data.ph?.ph7Voltage, current.ph7Voltage),

        ph10Voltage: numberValue(data.ph?.ph10Voltage, current.ph10Voltage),

        slope: numberValue(data.ph?.slope, current.slope),

        intercept: numberValue(data.ph?.intercept, current.intercept),

        calibratedAt: data.ph?.calibratedAt ?? current.calibratedAt,
      }));

      // ======================================================
      // WATER LEVEL
      // ======================================================

      setWaterCalibration((current) => ({
        tankDepth:
          numberValue(data.waterLevel?.tankDepth, current.tankDepth) ??
          current.tankDepth,

        distanceOffset:
          numberValue(
            data.waterLevel?.distanceOffset,
            current.distanceOffset,
          ) ?? current.distanceOffset,
      }));

      // ======================================================
      // FEEDER
      // ======================================================

      setFeederCalibration((current) => ({
        servoSeconds:
          numberValue(data.feeder?.servoSeconds, current.servoSeconds) ??
          current.servoSeconds,

        motorSeconds:
          numberValue(data.feeder?.motorSeconds, current.motorSeconds) ??
          current.motorSeconds,
      }));
    });
  }, []);

  // ==========================================================
  // SENSOR STATUS
  // ==========================================================

  const getStatus = (value: number | null, range: SensorRange) => {
    if (value === null) {
      return {
        label: "Check Required",
        type: "check",
      };
    }

    if (value < range.min || value > range.max) {
      return {
        label: "Critical",
        type: "critical",
      };
    }

    return {
      label: "Normal",
      type: "normal",
    };
  };

  const temperatureStatus = getStatus(
    sensorData.waterTemp,
    configValues.temperature,
  );

  const phStatus = getStatus(sensorData.ph, configValues.ph);

  const ammoniaStatus = getStatus(sensorData.ammonia, configValues.ammonia);

  const voltageStatus = getStatus(
    sensorData.batteryVoltage,
    configValues.batteryVoltage,
  );

  const currentStatus = getStatus(sensorData.current, configValues.current);

  const waterLevelStatus = getStatus(
    sensorData.waterLevel,
    configValues.waterLevel,
  );

  // ==========================================================
  // SAVE CONFIGURATION
  // ==========================================================

  const saveConfiguration = async () => {
    setSavingConfig(true);

    try {
      await update(ref(db, "/settings/configuration"), configValues);

      setShowConfiguration(false);
    } catch (error) {
      console.error("Failed to save sensor configuration:", error);

      alert("Failed to save configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  // ==========================================================
  // COMPLETE 3-POINT pH CALIBRATION
  // ==========================================================

  const completePHCalibration = async (
    ph4Voltage: number,
    ph7Voltage: number,
    ph10Voltage: number,
  ) => {
    if (
      !Number.isFinite(ph4Voltage) ||
      !Number.isFinite(ph7Voltage) ||
      !Number.isFinite(ph10Voltage)
    ) {
      setPHMessage("Invalid calibration voltage.");

      return;
    }

    // --------------------------------------------------------
    // Make sure all three voltages are different
    // --------------------------------------------------------

    if (
      ph4Voltage === ph7Voltage ||
      ph7Voltage === ph10Voltage ||
      ph4Voltage === ph10Voltage
    ) {
      setPHMessage("The three calibration voltages must be different.");

      return;
    }

    // --------------------------------------------------------
    // Expected pH probe voltage direction
    //
    // pH 4.00  = higher voltage
    // pH 7.00  = middle voltage
    // pH 10.01 = lower voltage
    // --------------------------------------------------------

    if (!(ph4Voltage > ph7Voltage && ph7Voltage > ph10Voltage)) {
      setPHMessage(
        "Expected voltage order is pH 4.00 > pH 7.00 > pH 10.01. Please verify the probe and buffer solutions.",
      );

      return;
    }

    // --------------------------------------------------------
    // Calculate legacy slope/intercept
    //
    // This is retained so existing CRAYTECH firmware/code
    // that uses slope/intercept remains compatible.
    // --------------------------------------------------------

    const slope = (7.0 - 4.0) / (ph7Voltage - ph4Voltage);

    const intercept = 4.0 - slope * ph4Voltage;

    const calibratedAt = new Date().toISOString();

    try {
      await update(ref(db, "/settings/calibration/ph"), {
        ph4Voltage,
        ph7Voltage,
        ph10Voltage,

        slope,
        intercept,

        calibratedAt,
      });

      setPHCalibration({
        ph4Voltage,
        ph7Voltage,
        ph10Voltage,

        slope,
        intercept,

        calibratedAt,
      });

      setPHMessage("Three-point pH calibration completed successfully.");
    } catch (error) {
      console.error("Failed to save final pH calibration:", error);

      setPHMessage("Failed to save final pH calibration.");
    }
  };

  // ==========================================================
  // SAVE PH 4.00
  // ==========================================================

  const savePH4Calibration = async () => {
    const phVoltage = sensorData.phVoltage;

    if (phVoltage === null || !Number.isFinite(phVoltage)) {
      setPHMessage(
        "No valid pH voltage is currently being received from the ESP32.",
      );

      return;
    }

    setSavingPH4(true);
    setPHMessage("");

    try {
      const newPH4Voltage = phVoltage;

      // Save the individual calibration point
      await set(ref(db, "/settings/calibration/ph/ph4Voltage"), newPH4Voltage);

      const existingPH7 = phCalibration.ph7Voltage;

      const existingPH10 = phCalibration.ph10Voltage;

      setPHCalibration((previous) => ({
        ...previous,
        ph4Voltage: newPH4Voltage,
      }));

      // Complete automatically if other two points exist
      if (existingPH7 !== null && existingPH10 !== null) {
        await completePHCalibration(newPH4Voltage, existingPH7, existingPH10);
      } else {
        setPHMessage(
          `pH 4.00 calibration point saved at ${newPH4Voltage.toFixed(3)} V.`,
        );
      }
    } catch (error) {
      console.error("Failed to save pH 4 calibration:", error);

      setPHMessage("Failed to save pH 4 calibration.");
    } finally {
      setSavingPH4(false);
    }
  };

  // ==========================================================
  // SAVE PH 7.00
  // ==========================================================

  const savePH7Calibration = async () => {
    const phVoltage = sensorData.phVoltage;

    if (phVoltage === null || !Number.isFinite(phVoltage)) {
      setPHMessage(
        "No valid pH voltage is currently being received from the ESP32.",
      );

      return;
    }

    setSavingPH7(true);
    setPHMessage("");

    try {
      const newPH7Voltage = phVoltage;

      // Save the individual calibration point
      await set(ref(db, "/settings/calibration/ph/ph7Voltage"), newPH7Voltage);

      const existingPH4 = phCalibration.ph4Voltage;

      const existingPH10 = phCalibration.ph10Voltage;

      setPHCalibration((previous) => ({
        ...previous,
        ph7Voltage: newPH7Voltage,
      }));

      // Complete automatically if other two points exist
      if (existingPH4 !== null && existingPH10 !== null) {
        await completePHCalibration(existingPH4, newPH7Voltage, existingPH10);
      } else {
        setPHMessage(
          `pH 7.00 calibration point saved at ${newPH7Voltage.toFixed(3)} V.`,
        );
      }
    } catch (error) {
      console.error("Failed to save pH 7 calibration:", error);

      setPHMessage("Failed to save pH 7 calibration.");
    } finally {
      setSavingPH7(false);
    }
  };

  // ==========================================================
  // SAVE PH 10.01
  // ==========================================================

  const savePH10Calibration = async () => {
    const phVoltage = sensorData.phVoltage;

    if (phVoltage === null || !Number.isFinite(phVoltage)) {
      setPHMessage(
        "No valid pH voltage is currently being received from the ESP32.",
      );

      return;
    }

    setSavingPH10(true);
    setPHMessage("");

    try {
      const newPH10Voltage = phVoltage;

      // Save the individual calibration point
      await set(
        ref(db, "/settings/calibration/ph/ph10Voltage"),
        newPH10Voltage,
      );

      const existingPH4 = phCalibration.ph4Voltage;

      const existingPH7 = phCalibration.ph7Voltage;

      setPHCalibration((previous) => ({
        ...previous,
        ph10Voltage: newPH10Voltage,
      }));

      // Complete automatically if other two points exist
      if (existingPH4 !== null && existingPH7 !== null) {
        await completePHCalibration(existingPH4, existingPH7, newPH10Voltage);
      } else {
        setPHMessage(
          `pH 10.01 calibration point saved at ${newPH10Voltage.toFixed(3)} V.`,
        );
      }
    } catch (error) {
      console.error("Failed to save pH 10.01 calibration:", error);

      setPHMessage("Failed to save pH 10.01 calibration.");
    } finally {
      setSavingPH10(false);
    }
  };

  // ==========================================================
  // SAVE WATER + FEEDER CALIBRATION
  // ==========================================================

  const saveCalibration = async () => {
    setSavingCalibration(true);

    try {
      /*
       * IMPORTANT:
       *
       * pH calibration is saved separately by the three
       * pH buttons above.
       *
       * This prevents the general "Save Calibration"
       * button from overwriting the live 3-point pH
       * calibration.
       */

      await update(ref(db, "/settings/calibration"), {
        waterLevel: waterCalibration,

        feeder: feederCalibration,
      });

      setShowCalibration(false);
    } catch (error) {
      console.error("Failed to save calibration:", error);

      alert("Failed to save calibration.");
    } finally {
      setSavingCalibration(false);
    }
  };

  // ==========================================================
  // RANGE DISPLAY
  // ==========================================================

  const rangeText = (range: SensorRange, unit: string) =>
    `${range.min} – ${range.max} ${unit}`;

  // ==========================================================
  // SENSOR CARD
  // ==========================================================

  const SensorCard = ({
    title,
    subtitle,
    icon,
    value,
    unit,
    range,
    status,
    secondaryText,
    accent = "blue",
  }: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    value: string;
    unit: string;
    range: string;
    status: {
      label: string;
      type: string;
    };
    secondaryText?: string;
    accent?: "blue" | "orange";
  }) => {
    const accentClass =
      accent === "orange" ? "border-orange-400" : "border-blue-500";

    const iconClass =
      accent === "orange"
        ? "bg-orange-50 text-orange-500"
        : "bg-blue-50 text-[#1749D1]";

    const statusClass =
      status.type === "normal"
        ? "bg-emerald-50 text-emerald-600"
        : status.type === "critical"
          ? "bg-red-50 text-red-600"
          : "bg-orange-50 text-orange-600";

    return (
      <div
        className={`
          rounded-xl
          border
          border-slate-200
          border-b-[3px]
          ${accentClass}
          bg-white
          p-2.5
          shadow-sm sm:p-3
          transition
          hover:shadow-md
        `}
      >
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                ${iconClass}
              `}
            >
              {icon}
            </div>

            <div>
              <h3 className="text-xs font-extrabold leading-tight text-[#102d79] sm:text-sm">
                {title}
              </h3>

              <p className="mt-0.5 text-[9px] leading-tight text-slate-400 sm:text-[10px]">
                {subtitle}
              </p>
            </div>
          </div>

          <span
            className={`
              rounded-full
              px-1.5
              py-0.5
              text-[8px]
              font-bold
              uppercase
              ${statusClass}
            `}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-xl font-extrabold leading-none text-slate-900 sm:text-2xl">
            {value}
          </span>

          <span className="text-[10px] font-semibold text-slate-500 sm:text-xs">
            {unit}
          </span>
        </div>

        <div className="mt-2 text-[9px] leading-tight text-slate-500 sm:text-[10px]">
          Configured range:
          <span className="ml-1 font-semibold text-[#102d79]">{range}</span>
        </div>

        {secondaryText && (
          <div className="mt-1.5 text-[10px] font-bold text-[#F59E0B] sm:text-xs">
            {secondaryText}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[8px] text-slate-500 sm:text-[9px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Live from Firebase
          </span>

          <span>Updates automatically</span>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <main className="w-full px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
        <div className="mx-auto w-full max-w-[1450px] space-y-4">
          {/* HERO */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1749D1] via-[#1557C0] to-[#102D79] px-4 py-4 text-white shadow-sm sm:px-6 sm:py-5 lg:px-7 lg:py-6">
            <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 rounded-full bg-[#F59E0B]/15 blur-2xl" />

            <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-blue-100 ring-1 ring-white/10">
                  <Activity size={14} />
                  CRAYTECH MONITORING
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
                    Sensor Readings
                  </h1>

                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-emerald-100 ring-1 ring-emerald-300/20">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                </div>

                <p className="mt-1.5 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm">
                  Real-time sensor readings from the CRAYTECH system.
                </p>

                {lastUpdated && (
                  <p className="mt-2 text-xs text-blue-200">
                    Updated automatically from Firebase
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* SENSOR CARDS */}
          <section>
            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#17365D] sm:text-lg">
                  Live Sensors
                </h2>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Current readings and configured operating ranges
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-400">
                Firebase live data
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <SensorCard
                title="pH Level"
                subtitle="pH Sensor"
                icon={<Waves size={24} />}
                value={formatNumber(sensorData.ph, 2)}
                unit="pH"
                range={rangeText(configValues.ph, "pH")}
                status={phStatus}
                accent="blue"
              />

              <SensorCard
                title="Water Temperature"
                subtitle="DS18B20 Sensor"
                icon={<Thermometer size={24} />}
                value={formatNumber(sensorData.waterTemp, 2)}
                unit="°C"
                range={rangeText(configValues.temperature, "°C")}
                status={temperatureStatus}
                accent="orange"
              />

              <SensorCard
                title="Ammonia"
                subtitle="Ammonia Sensor"
                icon={<Activity size={24} />}
                value={formatNumber(sensorData.ammonia, 2)}
                unit="mg/L"
                range={rangeText(configValues.ammonia, "mg/L")}
                status={ammoniaStatus}
                accent="orange"
              />

              <SensorCard
                title="Battery Voltage"
                subtitle="MAX471 Voltage"
                icon={<Battery size={24} />}
                value={formatNumber(sensorData.batteryVoltage, 2)}
                unit="V"
                range={rangeText(configValues.batteryVoltage, "V")}
                status={voltageStatus}
                secondaryText={
                  batteryPercent === null
                    ? "Battery: --"
                    : `Battery: ${batteryPercent}%`
                }
                accent="blue"
              />

              <SensorCard
                title="Current Draw"
                subtitle="MAX471 Current"
                icon={<Zap size={24} />}
                value={formatNumber(sensorData.current, 2)}
                unit="A"
                range={rangeText(configValues.current, "A")}
                status={currentStatus}
                accent="blue"
              />

              <SensorCard
                title="Water Level"
                subtitle="AJ-SR04M Water Level"
                icon={<Droplets size={24} />}
                value={formatNumber(sensorData.waterLevel, 1)}
                unit="cm"
                range={rangeText(configValues.waterLevel, "cm")}
                status={waterLevelStatus}
                accent="orange"
              />
            </div>
          </section>

          {/* SUMMARY CARDS */}
          <section className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1749D1]">
                  <Gauge size={22} />
                </div>

                <div className="min-w-0">
                  <p className="font-extrabold text-[#17365D]">Tank Fill</p>
                  <p className="text-xs text-slate-400">
                    Calculated from water level
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-2">
                <span className="text-xl font-extrabold text-[#17365D] sm:text-2xl">
                  {formatNumber(sensorData.waterPercent, 0)}%
                </span>

                <span className="text-sm font-semibold text-slate-500">
                  {formatNumber(sensorData.waterLevel, 1)} cm
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1749D1] to-[#3B82F6] transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, sensorData.waterPercent ?? 0),
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#F59E0B]">
                  <Clock3 size={22} />
                </div>

                <div className="min-w-0">
                  <p className="font-extrabold text-[#17365D]">Last Updated</p>
                  <p className="text-xs text-slate-400">ESP32 / Firebase</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-2xl font-extrabold text-[#17365D] sm:text-3xl">
                    {sensorData.time || "--:--:--"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {sensorData.date || "No date"}
                  </p>
                </div>

                <RefreshCw
                  size={23}
                  className={
                    lastUpdated
                      ? "shrink-0 text-emerald-500"
                      : "shrink-0 text-slate-300"
                  }
                />
              </div>
            </div>
          </section>

          {/* FLOATING ADD MENU - SAME STYLE AS FARM MANAGEMENT */}
          <div className="fixed bottom-6 right-5 z-[70] flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
            <div
              className={`flex origin-bottom-right flex-col items-end gap-2 transition-all duration-200 ease-out ${
                showAddMenu
                  ? "translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-3 scale-90 opacity-0"
              }`}
              aria-hidden={!showAddMenu}
            >
              <button
                type="button"
                tabIndex={showAddMenu ? 0 : -1}
                onClick={() => {
                  setShowAddMenu(false);
                  setShowConfiguration(true);
                }}
                className="rounded-full border border-gray-100 bg-white px-4 py-2.5 text-xs font-bold text-[#17365D] shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                + Configuration
              </button>

              <button
                type="button"
                tabIndex={showAddMenu ? 0 : -1}
                onClick={() => {
                  setShowAddMenu(false);
                  setShowCalibration(true);
                }}
                className="rounded-full border border-gray-100 bg-white px-4 py-2.5 text-xs font-bold text-[#17365D] shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                + Calibration
              </button>
            </div>

            <button
              type="button"
              aria-label={showAddMenu ? "Close add menu" : "Open add menu"}
              aria-expanded={showAddMenu}
              onClick={() => setShowAddMenu((current) => !current)}
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-3xl font-light text-white shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200 ${
                showAddMenu ? "rotate-45 bg-[#17365D]" : "rotate-0 bg-[#1749D1]"
              }`}
            >
              +
            </button>
          </div>

          {/* CONFIGURATION MODAL */}
          {showConfiguration && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-4">
              <div className="flex max-h-[84vh] w-full max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[90vh] sm:max-w-4xl">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-[#1749D1] to-[#102D79] px-3 py-3 text-white sm:px-6 sm:py-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold sm:text-xl">
                      Sensor Configuration
                    </h2>
                    <p className="mt-0.5 text-[10px] leading-4 text-blue-100 sm:mt-1 sm:text-sm">
                      Configure acceptable ranges for CRAYTECH sensors.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowConfiguration(false)}
                    className="shrink-0 rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white sm:p-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-6">
                    <ConfigRow
                      title="pH Level"
                      unit="pH"
                      min={configValues.ph.min}
                      max={configValues.ph.max}
                      onMinChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          ph: {
                            ...v.ph,
                            min: value,
                          },
                        }))
                      }
                      onMaxChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          ph: {
                            ...v.ph,
                            max: value,
                          },
                        }))
                      }
                    />

                    <ConfigRow
                      title="Water Temperature"
                      unit="°C"
                      min={configValues.temperature.min}
                      max={configValues.temperature.max}
                      onMinChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          temperature: {
                            ...v.temperature,
                            min: value,
                          },
                        }))
                      }
                      onMaxChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          temperature: {
                            ...v.temperature,
                            max: value,
                          },
                        }))
                      }
                    />

                    <ConfigRow
                      title="Ammonia"
                      unit="mg/L"
                      min={configValues.ammonia.min}
                      max={configValues.ammonia.max}
                      onMinChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          ammonia: {
                            ...v.ammonia,
                            min: value,
                          },
                        }))
                      }
                      onMaxChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          ammonia: {
                            ...v.ammonia,
                            max: value,
                          },
                        }))
                      }
                    />

                    <ConfigRow
                      title="Battery Voltage"
                      unit="V"
                      min={configValues.batteryVoltage.min}
                      max={configValues.batteryVoltage.max}
                      onMinChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          batteryVoltage: {
                            ...v.batteryVoltage,
                            min: value,
                          },
                        }))
                      }
                      onMaxChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          batteryVoltage: {
                            ...v.batteryVoltage,
                            max: value,
                          },
                        }))
                      }
                    />

                    <ConfigRow
                      title="Current Draw"
                      unit="A"
                      min={configValues.current.min}
                      max={configValues.current.max}
                      onMinChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          current: {
                            ...v.current,
                            min: value,
                          },
                        }))
                      }
                      onMaxChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          current: {
                            ...v.current,
                            max: value,
                          },
                        }))
                      }
                    />

                    <ConfigRow
                      title="Water Level"
                      unit="cm"
                      min={configValues.waterLevel.min}
                      max={configValues.waterLevel.max}
                      onMinChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          waterLevel: {
                            ...v.waterLevel,
                            min: value,
                          },
                        }))
                      }
                      onMaxChange={(value) =>
                        setConfigValues((v) => ({
                          ...v,
                          waterLevel: {
                            ...v.waterLevel,
                            max: value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5 sm:flex sm:justify-end sm:gap-3 sm:px-6 sm:py-3">
                  <button
                    type="button"
                    onClick={() => setShowConfiguration(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={saveConfiguration}
                    disabled={savingConfig}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1749D1] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#123BAA] disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:rounded-xl sm:px-5 sm:py-3 sm:text-sm"
                  >
                    {savingConfig ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CALIBRATION MODAL */}
          {showCalibration && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-4">
              <div className="flex max-h-[84vh] w-full max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[90vh] sm:max-w-4xl">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-[#1749D1] to-[#102D79] px-3 py-3 text-white sm:px-6 sm:py-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold sm:text-xl">
                      Sensor Calibration
                    </h2>
                    <p className="mt-0.5 text-[10px] leading-4 text-blue-100 sm:mt-1 sm:text-sm">
                      Calibrate pH, water level and feeder timing.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCalibration(false)}
                    className="shrink-0 rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white sm:p-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* TABS */}
                <div className="grid grid-cols-2 border-b border-slate-200 sm:grid-cols-4">
                  <CalibrationTab
                    active={calibrationTab === "ph"}
                    onClick={() => setCalibrationTab("ph")}
                  >
                    pH Sensor
                  </CalibrationTab>

                  <CalibrationTab
                    active={calibrationTab === "water"}
                    onClick={() => setCalibrationTab("water")}
                  >
                    Water Level
                  </CalibrationTab>

                  <CalibrationTab
                    active={calibrationTab === "servo"}
                    onClick={() => setCalibrationTab("servo")}
                  >
                    Feeder Servo
                  </CalibrationTab>

                  <CalibrationTab
                    active={calibrationTab === "motor"}
                    onClick={() => setCalibrationTab("motor")}
                  >
                    Feeder Motor
                  </CalibrationTab>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-3 sm:p-6">
                    {/* 3 POINT PH CALIBRATION */}
                    {calibrationTab === "ph" && (
                      <div>
                        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:mb-5 sm:rounded-2xl sm:p-5">
                          <div className="flex gap-3">
                            <Droplets
                              size={24}
                              className="mt-0.5 shrink-0 text-[#1749D1]"
                            />

                            <div className="min-w-0">
                              <h3 className="font-bold text-[#102d79]">
                                Three-Point pH Calibration
                              </h3>

                              <p className="mt-1 text-sm leading-6 text-blue-700">
                                Calibrate the CRAYTECH pH probe using pH 4.00,
                                pH 7.00, and pH 10.01 buffer solutions. Wait for
                                the voltage to stabilize before saving each
                                point.
                              </p>

                              <p className="mt-2 text-xs font-bold text-orange-600">
                                Recommended order: pH 4.00 → pH 7.00 → pH 10.01
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* LIVE READING */}
                        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mb-5 sm:rounded-2xl sm:p-5">
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="font-bold text-[#102d79]">
                                Live pH Sensor Reading
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                Current values received from the ESP32.
                              </p>
                            </div>

                            <div
                              className={`
                                flex w-fit items-center gap-2 rounded-full px-3 py-1.5
                                text-xs font-bold
                                ${
                                  sensorData.phVoltage !== null
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-orange-50 text-orange-600"
                                }
                              `}
                            >
                              <span
                                className={`
                                  h-2.5 w-2.5 rounded-full
                                  ${
                                    sensorData.phVoltage !== null
                                      ? "bg-emerald-500"
                                      : "bg-orange-500"
                                  }
                                `}
                              />
                              {sensorData.phVoltage !== null
                                ? "LIVE"
                                : "WAITING"}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                Current pH
                              </p>

                              <p className="mt-2 text-3xl font-extrabold text-[#102d79] sm:text-4xl">
                                {sensorData.ph === null
                                  ? "--"
                                  : sensorData.ph.toFixed(2)}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Current calculated pH
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                Raw pH Voltage
                              </p>

                              <p className="mt-2 text-3xl font-extrabold text-[#1749D1] sm:text-4xl">
                                {sensorData.phVoltage === null
                                  ? "--"
                                  : sensorData.phVoltage.toFixed(3)}

                                {sensorData.phVoltage !== null && (
                                  <span className="ml-1 text-lg">V</span>
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Raw ESP32 pH output
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* SAVED CALIBRATION POINTS */}
                        <div className="mb-4 grid grid-cols-1 gap-2 sm:mb-5 sm:grid-cols-3 sm:gap-3">
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                            <p className="text-xs font-bold uppercase text-[#1749D1]">
                              pH 4.00
                            </p>

                            <p className="mt-1 text-lg font-extrabold text-[#102d79]">
                              {phCalibration.ph4Voltage === null
                                ? "--"
                                : `${phCalibration.ph4Voltage.toFixed(3)} V`}
                            </p>
                          </div>

                          <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-center">
                            <p className="text-xs font-bold uppercase text-orange-500">
                              pH 7.00
                            </p>

                            <p className="mt-1 text-lg font-extrabold text-orange-700">
                              {phCalibration.ph7Voltage === null
                                ? "--"
                                : `${phCalibration.ph7Voltage.toFixed(3)} V`}
                            </p>
                          </div>

                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                            <p className="text-xs font-bold uppercase text-[#1749D1]">
                              pH 10.01
                            </p>

                            <p className="mt-1 text-lg font-extrabold text-[#102d79]">
                              {phCalibration.ph10Voltage === null
                                ? "--"
                                : `${phCalibration.ph10Voltage.toFixed(3)} V`}
                            </p>
                          </div>
                        </div>

                        {/* STEPS */}
                        <PHCalibrationStep
                          step="1"
                          title="pH 4.00 Buffer"
                          description="Rinse the probe, place it in pH 4.00 buffer solution, and wait for the voltage to stabilize."
                          target="pH 4.00"
                          voltage={sensorData.phVoltage}
                          savedVoltage={phCalibration.ph4Voltage}
                          saving={savingPH4}
                          color="blue"
                          onSave={savePH4Calibration}
                        />

                        <PHCalibrationStep
                          step="2"
                          title="pH 7.00 Buffer"
                          description="Rinse the probe, place it in pH 7.00 buffer solution, and wait for the voltage to stabilize."
                          target="pH 7.00"
                          voltage={sensorData.phVoltage}
                          savedVoltage={phCalibration.ph7Voltage}
                          saving={savingPH7}
                          color="orange"
                          onSave={savePH7Calibration}
                        />

                        <PHCalibrationStep
                          step="3"
                          title="pH 10.01 Buffer"
                          description="Rinse the probe, place it in pH 10.01 buffer solution, and wait for the voltage to stabilize."
                          target="pH 10.01"
                          voltage={sensorData.phVoltage}
                          savedVoltage={phCalibration.ph10Voltage}
                          saving={savingPH10}
                          color="blue"
                          onSave={savePH10Calibration}
                        />

                        {phMessage && (
                          <div
                            className={`
                              mt-5 rounded-xl border p-4
                              ${
                                phMessage.includes("successfully")
                                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                  : phMessage.includes("saved")
                                    ? "border-blue-100 bg-blue-50 text-[#1749D1]"
                                    : "border-orange-100 bg-orange-50 text-orange-700"
                              }
                            `}
                          >
                            <div className="flex items-start gap-2">
                              <CheckCircle2
                                size={18}
                                className="mt-0.5 shrink-0"
                              />

                              <span className="text-sm font-semibold">
                                {phMessage}
                              </span>
                            </div>
                          </div>
                        )}

                        {phCalibration.calibratedAt && (
                          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="flex items-start gap-2">
                              <CheckCircle2
                                size={18}
                                className="mt-0.5 shrink-0 text-emerald-600"
                              />

                              <div>
                                <p className="text-sm font-bold text-emerald-700">
                                  pH Calibration Active
                                </p>

                                <p className="mt-1 text-xs text-emerald-600">
                                  Last calibrated:{" "}
                                  {new Date(
                                    phCalibration.calibratedAt,
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* WATER LEVEL */}
                    {calibrationTab === "water" && (
                      <div className="space-y-4 sm:space-y-5">
                        <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 sm:rounded-2xl sm:p-5">
                          <h3 className="font-bold text-[#102d79]">
                            Water Level Calibration
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Set the actual tank depth and compensate for
                            AJ-SR04M sensor offset.
                          </p>
                        </div>

                        <NumberField
                          label="Tank Depth"
                          unit="cm"
                          value={waterCalibration.tankDepth}
                          onChange={(value) =>
                            setWaterCalibration((v) => ({
                              ...v,
                              tankDepth: value,
                            }))
                          }
                        />

                        <NumberField
                          label="Distance Offset"
                          unit="cm"
                          value={waterCalibration.distanceOffset}
                          onChange={(value) =>
                            setWaterCalibration((v) => ({
                              ...v,
                              distanceOffset: value,
                            }))
                          }
                        />

                        <div className="rounded-xl bg-blue-50 p-4 text-sm text-slate-600">
                          Current distance:{" "}
                          <strong>
                            {formatNumber(sensorData.distance, 1)} cm
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* FEEDER SERVO */}
                    {calibrationTab === "servo" && (
                      <div className="space-y-4 sm:space-y-5">
                        <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 sm:rounded-2xl sm:p-5">
                          <h3 className="font-bold text-[#102d79]">
                            Feeder Servo Calibration
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Set how many seconds the MG996R remains open before
                            the scattering motor starts.
                          </p>
                        </div>

                        <NumberField
                          label="Servo Open Time"
                          unit="seconds"
                          value={feederCalibration.servoSeconds}
                          onChange={(value) =>
                            setFeederCalibration((v) => ({
                              ...v,
                              servoSeconds: value,
                            }))
                          }
                        />

                        <div className="rounded-xl bg-blue-50 p-4 text-sm text-slate-600">
                          Current servo duration:{" "}
                          <strong>
                            {feederCalibration.servoSeconds} seconds
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* FEEDER MOTOR */}
                    {calibrationTab === "motor" && (
                      <div className="space-y-4 sm:space-y-5">
                        <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 sm:rounded-2xl sm:p-5">
                          <h3 className="font-bold text-[#102d79]">
                            Feeder Motor Calibration
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Set how many seconds the 12V feed scattering motor
                            runs.
                          </p>
                        </div>

                        <NumberField
                          label="Motor Run Time"
                          unit="seconds"
                          value={feederCalibration.motorSeconds}
                          onChange={(value) =>
                            setFeederCalibration((v) => ({
                              ...v,
                              motorSeconds: value,
                            }))
                          }
                        />

                        <div className="rounded-xl bg-blue-50 p-4 text-sm text-slate-600">
                          Feeder motor calibration value:{" "}
                          <strong>
                            {feederCalibration.motorSeconds} seconds
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5 sm:flex sm:justify-end sm:gap-3 sm:px-6 sm:py-3">
                  <button
                    type="button"
                    onClick={() => setShowCalibration(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={saveCalibration}
                    disabled={savingCalibration}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#D97706] disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:rounded-xl sm:px-5 sm:py-3 sm:text-sm"
                  >
                    {savingCalibration ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Save Calibration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// PH CALIBRATION STEP
// ============================================================

function PHCalibrationStep({
  step,
  title,
  description,
  target,
  voltage,
  savedVoltage,
  saving,
  color,
  onSave,
}: {
  step: string;
  title: string;
  description: string;
  target: string;
  voltage: number | null;
  savedVoltage: number | null;
  saving: boolean;
  color: "blue" | "orange";
  onSave: () => void;
}) {
  const isBlue = color === "blue";

  return (
    <div className="mb-3 rounded-xl border border-slate-200 p-3 sm:mb-4 sm:rounded-2xl sm:p-5">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              font-bold
              ${
                isBlue
                  ? "bg-blue-100 text-[#1749D1]"
                  : "bg-orange-100 text-orange-600"
              }
            `}
          >
            {step}
          </div>

          <div>
            <h3 className="font-bold text-slate-800">
              Step {step} — {title}
            </h3>

            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
        </div>

        {savedVoltage !== null && (
          <CheckCircle2
            size={22}
            className={
              isBlue ? "shrink-0 text-[#1749D1]" : "shrink-0 text-orange-500"
            }
          />
        )}
      </div>

      {/* ======================================================
          VOLTAGE / TARGET
      ====================================================== */}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-400">
            Current Voltage
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {voltage === null ? "--" : `${voltage.toFixed(3)} V`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Target</p>

          <p
            className={`
              mt-1
              text-2xl
              font-bold
              ${isBlue ? "text-[#1749D1]" : "text-orange-500"}
            `}
          >
            {target}
          </p>
        </div>
      </div>

      {/* ======================================================
          SAVED VOLTAGE
      ====================================================== */}

      {savedVoltage !== null && (
        <div
          className={`
            mt-3
            rounded-xl
            border
            p-3
            ${
              isBlue
                ? "border-blue-100 bg-blue-50"
                : "border-orange-100 bg-orange-50"
            }
          `}
        >
          <p
            className={`
              text-xs
              font-semibold
              ${isBlue ? "text-[#1749D1]" : "text-orange-600"}
            `}
          >
            Saved calibration voltage
          </p>

          <p
            className={`
              mt-1
              text-sm
              font-bold
              ${isBlue ? "text-[#102d79]" : "text-orange-700"}
            `}
          >
            {savedVoltage.toFixed(3)} V
          </p>
        </div>
      )}

      {/* ======================================================
          SAVE BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={onSave}
        disabled={saving || voltage === null}
        className={`
          mt-5
          flex
          w-full
          items-center
          justify-center
          gap-2
          rounded-xl
          px-5
          py-3
          text-sm
          font-bold
          text-white
          transition
          disabled:cursor-not-allowed
          disabled:opacity-50
          ${
            isBlue
              ? "bg-[#1749D1] hover:bg-[#123cae]"
              : "bg-orange-500 hover:bg-orange-600"
          }
        `}
      >
        {saving ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <Save size={17} />
        )}

        {saving ? "Saving..." : `Save ${target} Calibration`}
      </button>
    </div>
  );
}

// ============================================================
// CONFIG ROW
// ============================================================

function ConfigRow({
  title,
  unit,
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  title: string;
  unit: string;
  min: number;
  max: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h3 className="font-bold text-[#102d79]">{title}</h3>

        <p className="text-xs text-slate-400">Configure acceptable range</p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
        <input
          type="number"
          step="0.01"
          value={min}
          onChange={(e) => onMinChange(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1749D1]"
        />

        <span className="text-slate-400">–</span>

        <input
          type="number"
          step="0.01"
          value={max}
          onChange={(e) => onMaxChange(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1749D1]"
        />

        <span className="text-xs font-semibold text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

// ============================================================
// CALIBRATION TAB
// ============================================================

function CalibrationTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        border-b-2
        px-2
        py-2.5
        text-[11px]
        font-bold
        sm:px-4
        sm:py-4
        sm:text-sm
        transition
        ${
          active
            ? "border-orange-500 text-orange-500"
            : "border-transparent text-slate-500 hover:text-[#1749D1]"
        }
      `}
    >
      {children}
    </button>
  );
}

// ============================================================
// NUMBER FIELD
// ============================================================

function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#102d79]">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-[#1749D1]"
        />

        <span className="min-w-fit text-xs font-semibold text-slate-500">
          {unit}
        </span>
      </div>
    </div>
  );
}
