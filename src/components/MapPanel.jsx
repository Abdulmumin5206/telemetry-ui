import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPanel.css';

// Custom UAV marker icon
const uavIcon = L.divIcon({
  className: 'uav-marker',
  html: `<div class="uav-marker-inner">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L8 10h8L12 2z" fill="#00e5ff" opacity="0.9"/>
      <circle cx="12" cy="14" r="3" fill="#00e5ff"/>
      <path d="M12 17v4" stroke="#00e5ff" stroke-width="1.5"/>
      <circle cx="12" cy="14" r="6" fill="none" stroke="#00e5ff" stroke-width="0.5" opacity="0.4"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Home marker icon
const homeIcon = L.divIcon({
  className: 'home-marker',
  html: `<div class="home-marker-inner">H</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to recenter map smoothly
function MapAutoCenter({ position }) {
  const map = useMap();
  const isFirstRender = useRef(true);
  
  useEffect(() => {
    if (isFirstRender.current) {
      map.setView(position, 15);
      isFirstRender.current = false;
    }
    // Don't auto-pan on every update (let user freely navigate)
  }, []);

  return null;
}

export default React.memo(function MapPanel({ gpsData, gpsTrail }) {
  const currentPos = [gpsData.latitude, gpsData.longitude];
  const homePos = gpsTrail.length > 0 ? gpsTrail[0] : currentPos;

  return (
    <div className="panel map-panel" id="map-panel">
      <div className="panel-header">
        <span className="panel-header-dot blue" />
        <h2 className="panel-title">MAP</h2>
      </div>
      
      <div className="map-container">
        <MapContainer
          center={currentPos}
          zoom={15}
          className="leaflet-map"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapAutoCenter position={currentPos} />
          
          {/* Flight trail */}
          {gpsTrail.length > 1 && (
            <Polyline
              positions={gpsTrail}
              pathOptions={{
                color: '#ff9800',
                weight: 3,
                opacity: 0.8,
                dashArray: null,
              }}
            />
          )}

          {/* Home position */}
          <Marker position={homePos} icon={homeIcon}>
            <Popup>
              <span style={{ color: '#0a0f1a', fontWeight: 600 }}>Home Position</span>
            </Popup>
          </Marker>

          {/* Current UAV position */}
          <Marker position={currentPos} icon={uavIcon}>
            <Popup>
              <div style={{ color: '#0a0f1a', fontSize: '12px' }}>
                <strong>UAV Position</strong><br/>
                Lat: {gpsData.latitude.toFixed(7)}<br/>
                Lng: {gpsData.longitude.toFixed(7)}<br/>
                Alt: {gpsData.altitude.toFixed(1)}m
              </div>
            </Popup>
          </Marker>

          {/* Map controls overlay */}
          <div className="map-controls">
            <button className="map-ctrl-btn" title="Layers">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </button>
            <button className="map-ctrl-btn" title="Zoom In">+</button>
            <button className="map-ctrl-btn" title="Zoom Out">−</button>
            <button className="map-ctrl-btn" title="Center" style={{ fontSize: '12px' }}>⊕</button>
          </div>
        </MapContainer>

        {/* Info bar at bottom of map */}
        <div className="map-info-bar">
          <span>{gpsData.latitude.toFixed(7)}°N</span>
          <span>{gpsData.longitude.toFixed(7)}°E</span>
          <span>{gpsData.altitude.toFixed(1)} m</span>
          <span>{gpsData.speed.toFixed(1)} m/s</span>
          <span>{gpsData.course.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );
});
