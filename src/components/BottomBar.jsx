import React from 'react';
import './BottomBar.css';

export default function BottomBar({ mission, gpsData }) {
  return (
    <footer className="bottombar" id="bottombar">
      <div className="bottombar-item">
        <span className="bottombar-label">DATA RATE:</span>
        <span className="bottombar-value">{mission.dataRate} Hz</span>
      </div>
      <div className="bottombar-item">
        <span className="bottombar-label">STORAGE:</span>
        <span className="bottombar-value">{mission.storageUsed} GB / {mission.storageTotal} GB</span>
      </div>
      <div className="bottombar-item">
        <span className="bottombar-label">FLIGHT MODE:</span>
        <span className="bottombar-value highlight">{mission.flightMode}</span>
      </div>
      <div className="bottombar-item">
        <span className="bottombar-label">WIND:</span>
        <span className="bottombar-value">{mission.wind}</span>
      </div>
      <div className="bottombar-item">
        <span className="bottombar-label">TEMP:</span>
        <span className="bottombar-value">{mission.temperature} °C</span>
      </div>
    </footer>
  );
}
