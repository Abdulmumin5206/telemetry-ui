import React from 'react';
import './GPSPanel.css';

export default React.memo(function GPSPanel({ gpsData }) {
  return (
    <div className="panel gps-panel" id="gps-panel">
      <div className="panel-header">
        <span className="panel-header-dot green" />
        <h2 className="panel-title">GPS (GY-GPS6MV2)</h2>
      </div>

      <div className="gps-grid">
        <div className="gps-row gps-row-coords">
          <div className="gps-field">
            <span className="gps-label">LATITUDE</span>
            <span className="gps-value large">{gpsData.latitude.toFixed(7)}</span>
          </div>
          <div className="gps-field">
            <span className="gps-label">LONGITUDE</span>
            <span className="gps-value large">{gpsData.longitude.toFixed(7)}</span>
            <span className="gps-unit">°E</span>
          </div>
        </div>

        <div className="gps-row">
          <div className="gps-field full">
            <span className="gps-label">ALTITUDE</span>
            <div className="gps-value-group">
              <span className="gps-value">{gpsData.altitude.toFixed(1)}</span>
              <span className="gps-unit">m</span>
            </div>
          </div>
        </div>

        <div className="gps-row">
          <div className="gps-field">
            <span className="gps-label">SPEED</span>
            <div className="gps-value-group">
              <span className="gps-value">{gpsData.speed.toFixed(1)}</span>
              <span className="gps-unit">m/s</span>
            </div>
          </div>
          <div className="gps-field">
            <span className="gps-label">COURSE</span>
            <div className="gps-value-group">
              <span className="gps-value">{gpsData.course.toFixed(1)}</span>
              <span className="gps-unit">°</span>
            </div>
          </div>
        </div>

        <div className="gps-row gps-row-fix">
          <div className="gps-field">
            <span className="gps-label">FIX QUALITY</span>
            <span className="gps-value fix-badge">{gpsData.fixQuality}</span>
          </div>
          <div className="gps-field">
            <span className="gps-label">SATELLITES</span>
            <span className="gps-value">{gpsData.satellites}</span>
          </div>
          <div className="gps-field">
            <span className="gps-label">HDOP</span>
            <span className="gps-value">{gpsData.hdop}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
