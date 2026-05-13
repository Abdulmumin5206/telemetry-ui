import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis, XAxis, CartesianGrid } from 'recharts';
import UAV3DView from './UAV3DView';
import './SensorGrid.css';

// Format time tick from data index to HH:MM:SS
function formatTimeTick(tick, data) {
  const now = new Date();
  // Each data point is ~500ms apart (2Hz), so offset from now
  const totalPoints = data?.length || 50;
  const pointIndex = data?.findIndex(d => d.time === tick);
  const idx = pointIndex >= 0 ? pointIndex : 0;
  const secondsAgo = ((totalPoints - 1) - idx) * 0.5;
  const tickDate = new Date(now.getTime() - secondsAgo * 1000);
  const h = tickDate.getHours().toString().padStart(2, '0');
  const m = tickDate.getMinutes().toString().padStart(2, '0');
  const s = tickDate.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Reusable sensor chart matching the reference dark style
// Memoized to avoid re-renders when parent updates unrelated state
const SensorChart = React.memo(function SensorChart({ data, stroke, yDomain }) {
  // Calculate X-axis ticks: show 3 evenly spaced ticks
  const xTicks = useMemo(() => {
    if (!data || data.length < 3) return [];
    const first = data[0]?.time;
    const last = data[data.length - 1]?.time;
    const mid = data[Math.floor(data.length / 2)]?.time;
    return [first, mid, last];
  }, [data]);

  // Calculate Y-axis domain with padding
  const computedDomain = useMemo(() => {
    if (yDomain) return yDomain;
    if (!data || data.length === 0) return [0, 100];
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.15 || 5;
    // Round to nice numbers
    const niceMin = Math.floor((min - padding) / 10) * 10;
    const niceMax = Math.ceil((max + padding) / 10) * 10;
    return [niceMin, niceMax];
  }, [data, yDomain]);

  // Generate Y-axis ticks (3 ticks)
  const yTicks = useMemo(() => {
    const [min, max] = computedDomain;
    const mid = Math.round((min + max) / 2);
    return [min, mid, max];
  }, [computedDomain]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
        <CartesianGrid
          strokeDasharray="none"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
          horizontalPoints={yTicks}
        />
        <XAxis
          dataKey="time"
          ticks={xTicks}
          tickFormatter={(tick) => formatTimeTick(tick, data)}
          stroke="rgba(255,255,255,0.15)"
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'Share Tech Mono, monospace' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={computedDomain}
          ticks={yTicks}
          stroke="rgba(255,255,255,0.15)"
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'Share Tech Mono, monospace' }}
          tickLine={false}
          axisLine={false}
          width={35}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          filter={`drop-shadow(0 0 3px ${stroke}40)`}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

// IMU display — pure CSS visualization instead of a 3D Canvas
// This saves ~300-500MB by eliminating a WebGL context
const IMUVisualizer = React.memo(function IMUVisualizer({ imuData }) {
  const rollDeg = imuData.roll;
  const pitchDeg = imuData.pitch;
  
  return (
    <div className="imu-css-viz">
      <div 
        className="imu-cube-container"
        style={{ 
          transform: `rotateX(${-pitchDeg}deg) rotateZ(${rollDeg}deg)`,
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div className="imu-cube-face imu-front">F</div>
        <div className="imu-cube-face imu-back">B</div>
        <div className="imu-cube-face imu-top">T</div>
        <div className="imu-cube-face imu-bottom">B</div>
        <div className="imu-cube-face imu-left">L</div>
        <div className="imu-cube-face imu-right">R</div>
      </div>
      <div className="imu-axes">
        <span className="imu-axis-x">X</span>
        <span className="imu-axis-y">Y</span>
        <span className="imu-axis-z">Z</span>
      </div>
    </div>
  );
});

// Memoize sensor panels to avoid re-rendering when other panels' data changes
const SensorPanel = React.memo(function SensorPanel({ icon, iconColor, title, children }) {
  return (
    <div className="sensor-panel">
      <div className="sensor-header">
        <span className="sensor-icon" style={{ color: iconColor }}>{icon}</span>
        <h3 className="sensor-title" style={{ color: iconColor }}>{title}</h3>
      </div>
      <div className="sensor-body">
        {children}
      </div>
    </div>
  );
});

export default function SensorGrid({ imuData, imuRef, sensorData, sensorHistory, gpsData, currentTime }) {
  return (
    <div className="sensor-grid">
      {/* Row 1 */}
      {/* 1. BME680 */}
      <SensorPanel icon="◎" iconColor="#ab47bc" title="BME680">
        <div className="sensor-metrics-grid">
          <div className="sensor-metric">
            <span className="sensor-metric-label">TEMPERATURE</span>
            <div><span className="sensor-metric-value">{sensorData.bme680.temp.toFixed(1)}</span><span className="sensor-metric-unit">°C</span></div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">HUMIDITY</span>
            <div><span className="sensor-metric-value">{sensorData.bme680.humidity.toFixed(1)}</span><span className="sensor-metric-unit">%</span></div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">PRESSURE</span>
            <div><span className="sensor-metric-value">{sensorData.bme680.pressure.toFixed(1)}</span><span className="sensor-metric-unit">hPa</span></div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">GAS RESISTANCE</span>
            <div><span className="sensor-metric-value">{sensorData.bme680.gas.toFixed(1)}</span><span className="sensor-metric-unit">kΩ</span></div>
          </div>
        </div>
        <div className="sensor-graph-container">
          <SensorChart
            data={sensorHistory.bme680}
            stroke="#ab47bc"
          />
        </div>
      </SensorPanel>

      {/* 2. BME280 */}
      <SensorPanel icon="○" iconColor="#29b6f6" title="BME280">
        <div className="sensor-metrics-grid">
          <div className="sensor-metric">
            <span className="sensor-metric-label">TEMPERATURE</span>
            <div><span className="sensor-metric-value">{sensorData.bme280.temp.toFixed(1)}</span><span className="sensor-metric-unit">°C</span></div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">HUMIDITY</span>
            <div><span className="sensor-metric-value">{sensorData.bme280.humidity.toFixed(1)}</span><span className="sensor-metric-unit">%</span></div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">PRESSURE</span>
            <div><span className="sensor-metric-value">{sensorData.bme280.pressure.toFixed(1)}</span><span className="sensor-metric-unit">hPa</span></div>
          </div>
        </div>
        <div className="sensor-graph-container">
          <SensorChart
            data={sensorHistory.bme280}
            stroke="#29b6f6"
          />
        </div>
      </SensorPanel>

      {/* 3. BMP280 */}
      <SensorPanel icon="📄" iconColor="#ff9800" title="BMP280">
        <div className="sensor-metrics-grid">
          <div className="sensor-metric">
            <span className="sensor-metric-label">TEMPERATURE</span>
            <div><span className="sensor-metric-value">{sensorData.bmp280.temp.toFixed(1)}</span><span className="sensor-metric-unit">°C</span></div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">PRESSURE</span>
            <div><span className="sensor-metric-value">{sensorData.bmp280.pressure.toFixed(1)}</span><span className="sensor-metric-unit">hPa</span></div>
          </div>
        </div>
        <div className="sensor-graph-container">
          <SensorChart
            data={sensorHistory.bmp280}
            stroke="#ff9800"
          />
        </div>
      </SensorPanel>

      {/* 4. MPU-9250 (IMU) — Uses CSS cube instead of WebGL Canvas */}
      <div className="sensor-panel">
        <div className="sensor-header">
          <span className="sensor-icon" style={{ color: '#00e5ff' }}>⚙️</span>
          <h3 className="sensor-title" style={{ color: '#00e5ff' }}>MPU-9250 (IMU)</h3>
        </div>
        <div className="sensor-body" style={{ padding: '8px' }}>
          <div className="sensor-imu-cols">
            <div className="sensor-metric">
              <span className="sensor-metric-label">ACCELEROMETER (g)</span>
              <div style={{ display: 'flex', gap: '8px', color: '#ff4444' }}><span>X</span><span className="sensor-metric-value" style={{color: '#fff'}}>{imuData.accel.x.toFixed(2)}</span></div>
              <div style={{ display: 'flex', gap: '8px', color: '#44ff44' }}><span>Y</span><span className="sensor-metric-value" style={{color: '#fff'}}>{imuData.accel.y.toFixed(2)}</span></div>
              <div style={{ display: 'flex', gap: '8px', color: '#4488ff' }}><span>Z</span><span className="sensor-metric-value" style={{color: '#fff'}}>{imuData.accel.z.toFixed(2)}</span></div>
            </div>
            <div className="sensor-metric">
              <span className="sensor-metric-label">GYROSCOPE (°/s)</span>
              <div style={{ display: 'flex', gap: '8px', color: '#ff4444' }}><span>X</span><span className="sensor-metric-value" style={{color: '#fff'}}>{imuData.gyro.x.toFixed(2)}</span></div>
              <div style={{ display: 'flex', gap: '8px', color: '#44ff44' }}><span>Y</span><span className="sensor-metric-value" style={{color: '#fff'}}>{imuData.gyro.y.toFixed(2)}</span></div>
              <div style={{ display: 'flex', gap: '8px', color: '#4488ff' }}><span>Z</span><span className="sensor-metric-value" style={{color: '#fff'}}>{imuData.gyro.z.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="sensor-graph-container" style={{ position: 'relative', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
            <IMUVisualizer imuData={imuData} />
          </div>
        </div>
      </div>

      {/* Row 2 */}
      {/* 5. MICS-5524 */}
      <SensorPanel icon="⚗️" iconColor="#ffea00" title="MICS-5524 (GAS SENSOR)">
        <div className="sensor-metrics-grid">
          <div className="sensor-metric">
            <span className="sensor-metric-label">RAW VOLTAGE</span>
            <div><span className="sensor-metric-value">{sensorData.mics.raw.toFixed(3)}</span><span className="sensor-metric-unit">V</span></div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">RESISTANCE (Rs)</span>
            <div><span className="sensor-metric-value">{sensorData.mics.rs.toFixed(1)}</span><span className="sensor-metric-unit">kΩ</span></div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">Rs/R₀ RATIO</span>
            <div><span className="sensor-metric-value">{sensorData.mics.ratio.toFixed(2)}</span></div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">ACTIVITY INDEX</span>
            <div><span className="sensor-metric-value">{sensorData.mics.activity.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="sensor-graph-container">
          <SensorChart
            data={sensorHistory.mics}
            stroke="#ffea00"
          />
        </div>
      </SensorPanel>

      {/* 6. BATTERY */}
      <SensorPanel icon="🔋" iconColor="#00e676" title="BATTERY">
        <div className="sensor-metrics-grid">
          <div className="sensor-metric">
            <span className="sensor-metric-label">ADC READING</span>
            <div><span className="sensor-metric-value">{sensorData.battery.adc}</span><span className="sensor-metric-unit">counts</span></div>
          </div>
          <div className="sensor-metric" style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '40px', height: '20px', border: '2px solid #555', borderRadius: '3px', position: 'relative', padding: '2px' }}>
                <div style={{ width: `${sensorData.battery.percentage}%`, height: '100%', background: '#00e676', borderRadius: '1px' }}></div>
                <div style={{ position: 'absolute', right: '-4px', top: '4px', width: '2px', height: '8px', background: '#555', borderRadius: '0 2px 2px 0' }}></div>
              </div>
              <span className="sensor-metric-value">{sensorData.battery.percentage.toFixed(0)}%</span>
            </div>
          </div>
          <div className="sensor-metric">
            <span className="sensor-metric-label">VOLTAGE</span>
            <div><span className="sensor-metric-value">{sensorData.battery.voltage.toFixed(2)}</span><span className="sensor-metric-unit">V</span></div>
          </div>
        </div>
        <div className="sensor-graph-container">
          <SensorChart
            data={sensorHistory.battery}
            stroke="#00e676"
          />
        </div>
      </SensorPanel>

      {/* 7. ATTITUDE (from IMU) */}
      <div className="sensor-panel" style={{ padding: 0 }}>
        <div className="sensor-header" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
          <span className="sensor-icon" style={{ color: '#4488ff' }}>✈️</span>
          <h3 className="sensor-title" style={{ color: '#4488ff' }}>ATTITUDE (from IMU)</h3>
        </div>
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <UAV3DView imuData={imuData} imuRef={imuRef} hideHeader={true} />
        </div>
      </div>

      {/* 8. TELEMETRY LOG */}
      <div className="sensor-panel">
        <div className="sensor-header">
          <h3 className="sensor-title">TELEMETRY LOG</h3>
        </div>
        <div className="sensor-body">
          <div className="sensor-log-container">
            <div className="log-line">{currentTime.toLocaleTimeString()} GPS: {gpsData.latitude.toFixed(7)}, {gpsData.longitude.toFixed(7)}, {gpsData.altitude.toFixed(1)}m</div>
            <div className="log-line">{currentTime.toLocaleTimeString()} SPD: {gpsData.speed.toFixed(1)}m/s CRS: {gpsData.course.toFixed(1)}° SAT: {gpsData.satellites} HDOP: {gpsData.hdop}</div>
            <div className="log-line">{currentTime.toLocaleTimeString()} BME680: T={sensorData.bme680.temp.toFixed(1)}°C H={sensorData.bme680.humidity.toFixed(1)}% P={sensorData.bme680.pressure.toFixed(1)}hPa Gas={sensorData.bme680.gas.toFixed(1)}kΩ</div>
            <div className="log-line">{currentTime.toLocaleTimeString()} BME280: T={sensorData.bme280.temp.toFixed(1)}°C H={sensorData.bme280.humidity.toFixed(1)}% P={sensorData.bme280.pressure.toFixed(1)}hPa</div>
            <div className="log-line">{currentTime.toLocaleTimeString()} BMP280: T={sensorData.bmp280.temp.toFixed(1)}°C P={sensorData.bmp280.pressure.toFixed(1)}hPa</div>
            <div className="log-line">{currentTime.toLocaleTimeString()} IMU: Acc({imuData.accel.x.toFixed(2)},{imuData.accel.y.toFixed(2)},{imuData.accel.z.toFixed(2)}) Gyro({imuData.gyro.x.toFixed(2)},{imuData.gyro.y.toFixed(2)},{imuData.gyro.z.toFixed(2)})</div>
            <div className="log-line">{currentTime.toLocaleTimeString()} GAS: V={sensorData.mics.raw.toFixed(3)}V Rs={sensorData.mics.rs.toFixed(1)}kΩ Rs/R0={sensorData.mics.ratio.toFixed(2)} AI={sensorData.mics.activity.toFixed(2)}</div>
            <div className="log-line">{currentTime.toLocaleTimeString()} BAT: ADC={sensorData.battery.adc} V={sensorData.battery.voltage.toFixed(2)}V ({sensorData.battery.percentage.toFixed(0)}%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
