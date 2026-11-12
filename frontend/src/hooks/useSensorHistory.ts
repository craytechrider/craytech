import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase";

export type SensorType =
  | "waterTemp"
  | "ph"
  | "waterLevel"
  | "batteryVoltage"
  | "ammonia";

export interface HistoryPoint {
  timestamp: number;
  value: number;
}

interface SensorHistory {
  data: HistoryPoint[];
  loading: boolean;
  error: string | null;
}

interface FirebaseHistory {
  [date: string]: {
    [time: string]: number;
  };
}

export function useSensorHistory(
  sensor: SensorType,
  hours: number,
): SensorHistory {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const sensorRef = ref(db, `sensors/${sensor}`);

    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        try {
          const firebaseData = snapshot.val() as FirebaseHistory | null;

          if (!firebaseData) {
            setData([]);
            setLoading(false);
            return;
          }

          const points: HistoryPoint[] = [];

          // Convert Firebase structure:
          //
          // 2026-08-09
          //    14-20-00: 27.4
          //
          // into timestamp/value pairs.

          Object.entries(firebaseData).forEach(([date, times]) => {
            if (!times || typeof times !== "object") {
              return;
            }

            Object.entries(times).forEach(([time, value]) => {
              const timestamp = parseFirebaseDateTime(date, time);

              const numericValue = Number(value);

              if (!Number.isNaN(timestamp) && !Number.isNaN(numericValue)) {
                points.push({
                  timestamp,
                  value: numericValue,
                });
              }
            });
          });

          // Sort oldest → newest

          points.sort((a, b) => a.timestamp - b.timestamp);

          // Only keep selected timeframe

          const now = Date.now();

          const cutoff = now - hours * 60 * 60 * 1000;

          const filtered = points.filter((point) => point.timestamp >= cutoff);

          setData(filtered);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error("History error:", err);

          setError("Failed to load sensor history.");

          setLoading(false);
        }
      },
      (err) => {
        console.error("Firebase history error:", err);

        setError("Unable to load sensor history.");

        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [sensor, hours]);

  return {
    data,
    loading,
    error,
  };
}

// ==================================================
// Convert Firebase date/time to timestamp
// ==================================================

function parseFirebaseDateTime(date: string, time: string): number {
  // Firebase:
  //
  // date = 2026-08-09
  // time = 14-32-10
  //
  // Convert to:
  //
  // 2026-08-09T14:32:10

  const formattedTime = time.replace(/-/g, ":");

  const iso = `${date}T${formattedTime}`;

  const timestamp = new Date(iso).getTime();

  return timestamp;
}
