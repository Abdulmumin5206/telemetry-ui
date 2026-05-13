import React from 'react';
import './TopBar.css';

export default function TopBar({ mission, currentTime }) {
  const timeStr = currentTime.toLocaleTimeString('en-US', { hour12: false });
  const utcStr = currentTime.toISOString().slice(11, 19) + ' UTC';

  return (
    <header className="topbar" id="topbar">
      <div className="topbar-left">
        <span className="topbar-label">MISSION:</span>
        <span className="topbar-mission-name">{mission.name}</span>
        <span className="topbar-status-dot" />
      </div>

      <div className="topbar-center">
        <span className="topbar-label">STATUS:</span>
        <span className="topbar-status-value connected">{mission.status}</span>
      </div>

      <div className="topbar-actions">
        <button className="topbar-action-btn" id="btn-link" title="Link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
        <button className="topbar-action-btn" id="btn-edit" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button className="topbar-rec-btn" id="btn-rec">
          <span className="rec-dot" />
          REC
        </button>
      </div>

      <div className="topbar-time">
        <span className="topbar-time-main">{timeStr}</span>
        <span className="topbar-time-utc">{utcStr}</span>
      </div>
    </header>
  );
}
