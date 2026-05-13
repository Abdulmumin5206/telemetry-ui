/**
 * ============================================================
 * FAKE TELEMETRY DATA
 * ============================================================
 * This entire file contains mock/fake data for UI development.
 * DELETE THIS FILE when connecting to real telemetry sources.
 * All fake data is exported from this single module for easy removal.
 * ============================================================
 */

// GPS trail points (simulated flight path — wider spread for visibility)
export const FAKE_GPS_TRAIL = [
  [14.1200, 100.9830],
  [14.1210, 100.9840],
  [14.1218, 100.9852],
  [14.1222, 100.9865],
  [14.1225, 100.9878],
  [14.1230, 100.9888],
  [14.1235, 100.9895],
  [14.1238, 100.9880],
  [14.1240, 100.9868],
  [14.1238, 100.9855],
  [14.1235, 100.9845],
  [14.1234, 100.9860],
  [14.1234, 100.9876],
];

// Current GPS data
export const FAKE_GPS_DATA = {
  latitude: 14.1234567,
  longitude: 100.9876543,
  altitude: 123.4,
  speed: 12.6,
  course: 278.6,
  fixQuality: '3D Fix',
  satellites: 12,
  hdop: 0.8,
};

// IMU / Attitude data (from MPU-9250 or similar)
export const FAKE_IMU_DATA = {
  roll: -2.1,    // degrees
  pitch: 1.3,    // degrees
  yaw: 278.6,    // degrees (heading)
  gyro: { x: 0.35, y: -0.23, z: 0.11, omega: 0.43 },     // °/s
  angAcc: { x: 0.01, y: 0.02, z: -0.01, alpha: 0.03 },   // °/s²
  accelRaw: { x: 0.02, y: -0.01, z: 1.0 },               // g
  accelLin: { x: 0.1, y: -0.2, z: 0.5 },                 // m/s²
  velocity: { x: 0.1, y: -0.05, z: 0.02, v: 0.11 }       // m/s
};

// Flight status
export const FAKE_FLIGHT_STATUS = {
  armed: true,
  gpsFix: true,
  satellites: 12,
  hdop: 0.8,
  uptime: '00:12:45',
  memory: 45,
};

// System health
export const FAKE_SYSTEM_HEALTH = {
  percentage: 100,
  status: 'ALL SYSTEMS NOMINAL',
};

// Additional Sensor Data for Grid
export const FAKE_SENSOR_DATA = {
  env680: { temp: 27.4, humidity: 45.2, pressure: 1008.7, gas: 152.3 },
  env280: { temp: 27.6, humidity: 44.8, pressure: 1008.6 },
  mics: { vout: 0.732, rs: 15.3, ratio: 1.28, idx: 42.0 },
  battery: { adc: 2457, voltage: 14.82 }
};

// Create some initial history (e.g. 50 points)
export const createInitialHistory = (baseVal, variance) => {
  return Array(50).fill(0).map((_, i) => ({
    time: i,
    value: baseVal + (Math.random() - 0.5) * variance
  }));
};

export const FAKE_SENSOR_HISTORY = {
  env680: createInitialHistory(150, 10),   // Gas resistance history
  env280: createInitialHistory(1008, 1),   // Pressure history
  mics: createInitialHistory(1.0, 0.2),    // Ratio history
  battery: createInitialHistory(14.8, 0.1) // Voltage history
};

// Mission info
export const FAKE_MISSION = {
  name: 'TEST FLIGHT',
  status: 'CONNECTED',
  dataRate: 25,
  storageUsed: 7.2,
  storageTotal: 15.6,
  flightMode: 'STABILIZE',
  wind: '3.2 m/s NE',
  temperature: 27.4,
};

// Helper to generate a simulated live GPS position with slight variation
export function generateLiveGPS(baseData = FAKE_GPS_DATA) {
  const variation = () => (Math.random() - 0.5) * 0.00001;
  return {
    ...baseData,
    latitude: baseData.latitude + variation(),
    longitude: baseData.longitude + variation(),
    altitude: baseData.altitude + (Math.random() - 0.5) * 0.5,
    speed: Math.max(0, baseData.speed + (Math.random() - 0.5) * 0.3),
    course: (baseData.course + (Math.random() - 0.5) * 2 + 360) % 360,
  };
}

// Helper to generate simulated live IMU with gentle oscillation
export function generateLiveIMU(baseData = FAKE_IMU_DATA, t = 0) {
  return {
    roll: baseData.roll + Math.sin(t * 0.5) * 1.5 + (Math.random() - 0.5) * 0.4,
    pitch: baseData.pitch + Math.cos(t * 0.3) * 0.8 + (Math.random() - 0.5) * 0.3,
    yaw: (baseData.yaw + Math.sin(t * 0.1) * 3 + 360) % 360,
    gyro: {
      x: baseData.gyro.x + (Math.random() - 0.5) * 0.1,
      y: baseData.gyro.y + (Math.random() - 0.5) * 0.1,
      z: baseData.gyro.z + (Math.random() - 0.5) * 0.05,
      omega: baseData.gyro.omega + (Math.random() - 0.5) * 0.1,
    },
    angAcc: {
      x: baseData.angAcc.x + (Math.random() - 0.5) * 0.05,
      y: baseData.angAcc.y + (Math.random() - 0.5) * 0.05,
      z: baseData.angAcc.z + (Math.random() - 0.5) * 0.05,
      alpha: baseData.angAcc.alpha + (Math.random() - 0.5) * 0.05,
    },
    accelRaw: {
      x: baseData.accelRaw.x + (Math.random() - 0.5) * 0.02,
      y: baseData.accelRaw.y + (Math.random() - 0.5) * 0.02,
      z: baseData.accelRaw.z + (Math.random() - 0.5) * 0.05,
    },
    accelLin: {
      x: baseData.accelLin.x + (Math.random() - 0.5) * 0.05,
      y: baseData.accelLin.y + (Math.random() - 0.5) * 0.05,
      z: baseData.accelLin.z + (Math.random() - 0.5) * 0.05,
    },
    velocity: {
      x: baseData.velocity.x + (Math.random() - 0.5) * 0.02,
      y: baseData.velocity.y + (Math.random() - 0.5) * 0.02,
      z: baseData.velocity.z + (Math.random() - 0.5) * 0.02,
      v: baseData.velocity.v + (Math.random() - 0.5) * 0.02,
    }
  };
}

// Helper to generate simulated live sensor data
export function generateLiveSensors(baseData = FAKE_SENSOR_DATA, t = 0) {
  return {
    env680: {
      ...baseData.env680,
      temp: baseData.env680.temp + (Math.random() - 0.5) * 0.1,
      humidity: baseData.env680.humidity + (Math.random() - 0.5) * 0.2,
      pressure: baseData.env680.pressure + (Math.random() - 0.5) * 0.1,
      gas: baseData.env680.gas + Math.sin(t * 0.2) * 5 + (Math.random() - 0.5) * 2
    },
    env280: {
      ...baseData.env280,
      temp: baseData.env280.temp + (Math.random() - 0.5) * 0.1,
      humidity: baseData.env280.humidity + (Math.random() - 0.5) * 0.2,
      pressure: baseData.env280.pressure + Math.sin(t * 0.3) * 0.5 + (Math.random() - 0.5) * 0.1
    },
    mics: {
      ...baseData.mics,
      vout: baseData.mics.vout + (Math.random() - 0.5) * 0.01,
      rs: baseData.mics.rs + (Math.random() - 0.5) * 0.2,
      ratio: baseData.mics.ratio + Math.sin(t * 0.1) * 0.1 + (Math.random() - 0.5) * 0.05,
      idx: baseData.mics.idx + (Math.random() - 0.5) * 0.5
    },
    battery: {
      ...baseData.battery,
      adc: Math.max(0, baseData.battery.adc + Math.round((Math.random() - 0.5) * 2)),
      voltage: baseData.battery.voltage - 0.0001
    }
  };
}
