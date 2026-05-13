import React from 'react';
import './Sidebar.css';

const navItems = [
  { icon: '📊', label: 'DASHBOARD', id: 'dashboard', active: true },
  { icon: '🗺️', label: 'MAP', id: 'map' },
  { icon: '🧊', label: '3D VIEW', id: '3dview' },
  { icon: '📡', label: 'SENSORS', id: 'sensors' },
  { icon: '📋', label: 'LOGS', id: 'logs' },
  { icon: '⚙️', label: 'SETTINGS', id: 'settings' },
];

export default function Sidebar({ systemHealth, flightStatus, activeNav, onNavChange }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">UAV</span>
          <span className="sidebar-logo-subtitle">GROUND STATION</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`sidebar-nav-item ${activeNav === item.id ? 'active' : ''}`}
            onClick={() => onNavChange(item.id)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* System Health */}
      <div className="sidebar-section">
        <h3 className="sidebar-section-title">SYSTEM HEALTH</h3>
        <div className="sidebar-health">
          <div className="health-ring">
            <svg viewBox="0 0 72 72" className="health-ring-svg">
              <circle
                cx="36" cy="36" r="30"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="4"
              />
              <circle
                cx="36" cy="36" r="30"
                fill="none"
                stroke={systemHealth.percentage >= 80 ? '#00e676' : systemHealth.percentage >= 50 ? '#ffab00' : '#ff1744'}
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - systemHealth.percentage / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 36 36)"
                className="health-ring-progress"
              />
            </svg>
            <div className="health-ring-text">
              <span className="health-ring-value">{systemHealth.percentage}%</span>
            </div>
          </div>
          <span className="health-status-text">{systemHealth.status}</span>
        </div>
      </div>

      {/* Flight Status */}
      <div className="sidebar-section">
        <h3 className="sidebar-section-title">FLIGHT STATUS</h3>
        <div className="sidebar-status-list">
          <div className="status-item">
            <span className={`status-indicator ${flightStatus.armed ? 'armed' : ''}`} />
            <span className="status-label">ARMED</span>
          </div>
          <div className="status-item">
            <span className={`status-indicator ${flightStatus.gpsFix ? 'gps-fix' : ''}`} />
            <span className="status-label">GPS FIX</span>
          </div>
          <div className="status-item">
            <span className="status-icon">📡</span>
            <span className="status-label">Satellites</span>
            <span className="status-value">{flightStatus.satellites}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">📏</span>
            <span className="status-label">HDOP</span>
            <span className="status-value">{flightStatus.hdop}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">⏱️</span>
            <span className="status-label">UPTIME</span>
            <span className="status-value">{flightStatus.uptime}</span>
          </div>
          <div className="status-item">
            <span className="status-icon">💾</span>
            <span className="status-label">MEMORY</span>
            <span className="status-value">{flightStatus.memory}%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
