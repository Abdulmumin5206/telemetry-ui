import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import BottomBar from './components/BottomBar';
import GPSPanel from './components/GPSPanel';
import MapPanel from './components/MapPanel';
import SensorGrid from './components/SensorGrid';
import UAV3DView from './components/UAV3DView';
import { useTelemetryData } from './hooks/useTelemetryData';
import './App.css';

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const { gpsData, gpsTrail, imuData, imuRef, flightStatus, systemHealth, mission, sensorData, sensorHistory, currentTime } = useTelemetryData();

  return (
    <div className="app">
      <Sidebar
        systemHealth={systemHealth}
        flightStatus={flightStatus}
        activeNav={activeNav}
        onNavChange={setActiveNav}
      />

      <div className="app-main">
        <TopBar mission={mission} currentTime={currentTime} />

        <div className="app-content">
          {activeNav === 'dashboard' && (
            <div className="full-dashboard">
              <div className="dashboard-top">
                <GPSPanel gpsData={gpsData} />
                <MapPanel gpsData={gpsData} gpsTrail={gpsTrail} />
                <UAV3DView imuData={imuData} imuRef={imuRef} />
              </div>
              <div className="dashboard-bottom">
                <SensorGrid 
                  imuData={imuData}
                  imuRef={imuRef}
                  sensorData={sensorData} 
                  sensorHistory={sensorHistory}
                  gpsData={gpsData}
                  currentTime={currentTime}
                />
              </div>
            </div>
          )}

          {activeNav === 'map' && (
            <div className="dashboard-grid">
              <GPSPanel gpsData={gpsData} />
              <MapPanel gpsData={gpsData} gpsTrail={gpsTrail} />
            </div>
          )}
          
          {activeNav !== 'dashboard' && activeNav !== 'map' && (
            <div className="panel-placeholder" style={{height: '100%'}}>
              <div className="placeholder-text">
                MODULE CONTENT HERE
              </div>
            </div>
          )}
        </div>

        <BottomBar mission={mission} gpsData={gpsData} />
      </div>
    </div>
  );
}
