export interface CurrentSensors {
  waterTemp: number | null;
  ph: number | null;
  batteryVoltage: number | null;
  currentDraw: number | null;
  distance: number | null;
  waterLevel: number | null;
  waterPercent: number | null;

  // Future sensor
  ammonia: number | null;

  date: string | null;
  time: string | null;
}
