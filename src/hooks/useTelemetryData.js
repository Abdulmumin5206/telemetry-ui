import { useState, useEffect, useRef } from 'react';
import {
  FAKE_GPS_DATA,
  FAKE_GPS_TRAIL,
  FAKE_FLIGHT_STATUS,
  FAKE_SYSTEM_HEALTH,
  FAKE_MISSION,
  FAKE_IMU_DATA,
  FAKE_SENSOR_DATA,
  FAKE_SENSOR_HISTORY,
  generateLiveGPS,
  generateLiveIMU,
  generateLiveSensors,
} from '../data/fakeData';

/**
 * ============================================================
 * FAKE DATA HOOK
 * ============================================================
 * This hook provides simulated live telemetry data.
 * REPLACE this hook with real data source when connecting
 * to actual telemetry (e.g., WebSocket, Serial, MQTT).
 * ============================================================
 */
export function useTelemetryData() {
  const [gpsData, setGpsData] = useState(FAKE_GPS_DATA);
  const [gpsTrail, setGpsTrail] = useState(FAKE_GPS_TRAIL);
  const [imuData, setImuData] = useState(FAKE_IMU_DATA);
  const [flightStatus, setFlightStatus] = useState(FAKE_FLIGHT_STATUS);
  const [systemHealth] = useState(FAKE_SYSTEM_HEALTH);
  const [mission] = useState(FAKE_MISSION);
  const [sensorData, setSensorData] = useState(FAKE_SENSOR_DATA);
  const [sensorHistory, setSensorHistory] = useState(FAKE_SENSOR_HISTORY);
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef(null);
  const tickRef = useRef(0);

  useEffect(() => {
    // Simulate live updates at ~10Hz for smooth 3D, GPS at 1Hz
    intervalRef.current = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current * 0.1; // time in seconds

      // IMU updates every tick (smooth 3D)
      setImuData(generateLiveIMU(FAKE_IMU_DATA, t));

      // Sensor updates every tick
      setSensorData(prev => {
        const newSensors = generateLiveSensors(prev, t);
        setSensorHistory(hist => {
          const tick = tickRef.current;
          return {
            bme680: [...hist.bme680.slice(-49), { time: tick, value: newSensors.bme680.gas }],
            bme280: [...hist.bme280.slice(-49), { time: tick, value: newSensors.bme280.pressure }],
            bmp280: [...hist.bmp280.slice(-49), { time: tick, value: newSensors.bmp280.pressure }],
            mics: [...hist.mics.slice(-49), { time: tick, value: newSensors.mics.ratio }],
            battery: [...hist.battery.slice(-49), { time: tick, value: newSensors.battery.voltage }]
          };
        });
        return newSensors;
      });

      // GPS + clock updates every 10th tick (~1Hz)
      if (tickRef.current % 10 === 0) {
        setGpsData(prev => {
          const newGps = generateLiveGPS(prev);
          setGpsTrail(trail => {
            const updated = [...trail, [newGps.latitude, newGps.longitude]];
            return updated.length > 50 ? updated.slice(-50) : updated;
          });
          return newGps;
        });
        setCurrentTime(new Date());

        // Uptime tick
        setFlightStatus(prev => {
          const parts = prev.uptime.split(':').map(Number);
          let secs = parts[0] * 3600 + parts[1] * 60 + parts[2] + 1;
          const h = String(Math.floor(secs / 3600)).padStart(2, '0');
          const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
          const s = String(secs % 60).padStart(2, '0');
          return { ...prev, uptime: `${h}:${m}:${s}` };
        });
      }
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, []);

  return {
    gpsData,
    gpsTrail,
    imuData,
    flightStatus,
    systemHealth,
    mission,
    sensorData,
    sensorHistory,
    currentTime,
  };
}
