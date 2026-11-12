import { useEffect, useState } from "react";
import { onValue, ref, set } from "firebase/database";

import { db } from "../firebase";

export interface DeviceControls {
  aerator: boolean;
  feeder: boolean;
  solenoid: boolean;
}

export function useDeviceControls() {
  const [devices, setDevices] = useState<DeviceControls>({
    aerator: false,
    feeder: false,
    solenoid: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const devicesRef = ref(db, "devices");

    const unsubscribe = onValue(
      devicesRef,
      (snapshot) => {
        const value = snapshot.val() || {};

        setDevices({
          aerator: value.aerator?.isOn === true,
          feeder: value.feeder?.isOn === true,
          solenoid: value.solenoid?.isOn === true,
        });

        setLoading(false);
      },
      (firebaseError) => {
        console.error("Firebase device error:", firebaseError);

        setError(firebaseError.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const setAerator = async (isOn: boolean) => {
    try {
      await set(ref(db, "devices/aerator/isOn"), isOn);
    } catch (error) {
      console.error("Failed to update aerator:", error);
      throw error;
    }
  };

  const setFeeder = async (isOn: boolean) => {
    try {
      await set(ref(db, "devices/feeder/isOn"), isOn);
    } catch (error) {
      console.error("Failed to update feeder:", error);
      throw error;
    }
  };

  const setSolenoid = async (isOn: boolean) => {
    try {
      await set(ref(db, "devices/solenoid/isOn"), isOn);
    } catch (error) {
      console.error("Failed to update solenoid:", error);
      throw error;
    }
  };

  return {
    devices,
    loading,
    error,
    setAerator,
    setFeeder,
    setSolenoid,
  };
}
