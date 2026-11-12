import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";

export interface CurrentSensors {
  waterTemp: number | null;
  ph: number | null;
  phVoltage: number | null;
  ammonia: number | null;
  batteryVoltage: number | null;
  current: number | null;
  currentDraw: number | null;
  waterLevel: number | null;
  waterPercent: number | null;
  distance: number | null;
  date: string;
  time: string;
  dateTime: string;
}

const DEFAULT_DATA: CurrentSensors = {
  waterTemp: null,
  ph: null,
  phVoltage: null,
  ammonia: null,
  batteryVoltage: null,
  current: null,
  currentDraw: null,
  waterLevel: null,
  waterPercent: null,
  distance: null,
  date: "",
  time: "",
  dateTime: "",
};

const toNumber = (value: unknown): number | null => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export function useCurrentSensors() {
  const [data, setData] = useState<CurrentSensors>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentRef = ref(db, "current");

    const unsubscribe = onValue(
      currentRef,
      (snapshot) => {
        const value = snapshot.val();

        if (!value) {
          setLoading(false);
          return;
        }

        const current = toNumber(value.current ?? value.currentDraw);

        setData({
          waterTemp: toNumber(value.waterTemp),
          ph: toNumber(value.ph),
          phVoltage: toNumber(value.phVoltage),
          ammonia: toNumber(value.ammonia),
          batteryVoltage: toNumber(value.batteryVoltage),
          current,
          currentDraw: current,
          waterLevel: toNumber(value.waterLevel),
          waterPercent: toNumber(value.waterPercent),
          distance: toNumber(value.distance),
          date: String(value.date ?? ""),
          time: String(value.time ?? ""),
          dateTime: String(value.dateTime ?? ""),
        });

        setError(null);
        setLoading(false);
      },
      (firebaseError) => {
        console.error("Firebase current sensor listener error:", firebaseError);
        setError("Unable to load current sensor readings from Firebase.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { data, loading, error };
}
