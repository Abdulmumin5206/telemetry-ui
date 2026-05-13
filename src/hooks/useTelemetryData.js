import { useState, useEffect, useRef, useCallback } from 'react';
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
 * FAKE DATA HOOK — OPTIMIZED FOR LOW MEMORY
 * ============================================================
 * Key optimizations:
 * - IMU data uses useRef (no React re-render, read by Three.js directly)
 * - Sensor history updates throttled to 2Hz (was 10Hz)
 * - GPS + clock still 1Hz
 * - Sensor display values update at 2Hz
 * ============================================================
 */

// Max data points kept in history (was unbounded via slice)
const MAX_HISTORY_POINTS = 50;

// Reusable function to push to a ring-buffer style array
function pushToHistory(arr, newPoint) {
  if (arr.length >= MAX_HISTORY_POINTS) {
    arr.shift();
  }
  arr.push(newPoint);
  return arr;
}

export function useTelemetryData() {
  const [gpsData, setGpsData] = useState(FAKE_GPS_DATA);
  const [gpsTrail, setGpsTrail] = useState(FAKE_GPS_TRAIL);
  const [flightStatus, setFlightStatus] = useState(FAKE_FLIGHT_STATUS);
  const [systemHealth] = useState(FAKE_SYSTEM_HEALTH);
  const [mission] = useState(FAKE_MISSION);
  const [sensorData, setSensorData] = useState(FAKE_SENSOR_DATA);
  const [sensorHistory, setSensorHistory] = useState(FAKE_SENSOR_HISTORY);
  const [currentTime, setCurrentTime] = useState(new Date());

  // IMU data via ref — Three.js reads this directly, no React re-render needed
  const imuRef = useRef(FAKE_IMU_DATA);
  // We still expose a state version for non-3D IMU displays, but update it at 2Hz
  const [imuData, setImuData] = useState(FAKE_IMU_DATA);

  const tickRef = useRef(0);
  const sensorDataRef = useRef(FAKE_SENSOR_DATA);
  const historyRef = useRef({
    env680: [...FAKE_SENSOR_HISTORY.env680],
    env280: [...FAKE_SENSOR_HISTORY.env280],
    mics: [...FAKE_SENSOR_HISTORY.mics],
    battery: [...FAKE_SENSOR_HISTORY.battery],
  });

  useEffect(() => {
    // Fast loop: 10Hz — ONLY updates the IMU ref for smooth 3D
    const fastInterval = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current * 0.1;
      imuRef.current = generateLiveIMU(FAKE_IMU_DATA, t);
    }, 100);

    // Medium loop: 2Hz — Updates sensor values, charts, and IMU display
    const mediumInterval = setInterval(() => {
      const t = tickRef.current * 0.1;
      const tick = tickRef.current;

      // Sync IMU state for display panels (2Hz is plenty for text readouts)
      setImuData({ ...imuRef.current });

      // Generate new sensor values
      const newSensors = generateLiveSensors(sensorDataRef.current, t);
      sensorDataRef.current = newSensors;
      setSensorData(newSensors);

      // Update history in-place (mutate ref, then snapshot for React)
      const h = historyRef.current;
      pushToHistory(h.env680, { time: tick, value: newSensors.env680.gas });
      pushToHistory(h.env280, { time: tick, value: newSensors.env280.pressure });
      pushToHistory(h.mics, { time: tick, value: newSensors.mics.ratio });
      pushToHistory(h.battery, { time: tick, value: newSensors.battery.voltage });

      // Snapshot for React (shallow copy of arrays)
      setSensorHistory({
        env680: [...h.env680],
        env280: [...h.env280],
        mics: [...h.mics],
        battery: [...h.battery],
      });
    }, 500);

    // Slow loop: 1Hz — GPS, clock, flight status
    const slowInterval = setInterval(() => {
      setGpsData(prev => {
        const newGps = generateLiveGPS(prev);
        setGpsTrail(trail => {
          const updated = [...trail, [newGps.latitude, newGps.longitude]];
          return updated.length > 50 ? updated.slice(-50) : updated;
        });
        return newGps;
      });
      setCurrentTime(new Date());

      setFlightStatus(prev => {
        const parts = prev.uptime.split(':').map(Number);
        let secs = parts[0] * 3600 + parts[1] * 60 + parts[2] + 1;
        const h = String(Math.floor(secs / 3600)).padStart(2, '0');
        const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        return { ...prev, uptime: `${h}:${m}:${s}` };
      });
    }, 1000);

    return () => {
      clearInterval(fastInterval);
      clearInterval(mediumInterval);
      clearInterval(slowInterval);
    };
  }, []);

  return {
    gpsData,
    gpsTrail,
    imuData,
    imuRef,      // Expose ref for Three.js direct access
    flightStatus,
    systemHealth,
    mission,
    sensorData,
    sensorHistory,
    currentTime,
  };
}
