import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './UAV3DView.css';

/* ─────────────────────────────────────────────
   Fixed-wing aircraft — nose along -Z axis
   Uses only simple mesh primitives for reliability
   
   OPTIMIZED: Reads IMU from ref, not state (no re-renders)
   ───────────────────────────────────────────── */
function FixedWingAircraft({ imuRef, imuData }) {
  const groupRef = useRef();
  // Reuse these objects to avoid GC pressure
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), []);
  const targetQ = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!groupRef.current) return;
    // Read from ref for smooth updates without React re-renders
    const data = imuRef?.current || imuData;
    const tRoll = THREE.MathUtils.degToRad(data.roll);
    const tPitch = THREE.MathUtils.degToRad(-data.pitch);
    euler.set(tPitch, 0, tRoll, 'YXZ');
    targetQ.setFromEuler(euler);
    groupRef.current.quaternion.slerp(targetQ, 0.15);
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage — cylinder along Z via rotation */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.055, 1.8, 12]} />
        <meshPhongMaterial color="#b0bcc8" shininess={60} />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 0, -1.08]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.09, 0.35, 12]} />
        <meshPhongMaterial color="#1a2535" shininess={80} />
      </mesh>

      {/* Main Wings */}
      <mesh position={[0, 0.015, 0.05]}>
        <boxGeometry args={[2.8, 0.02, 0.32]} />
        <meshPhongMaterial color="#a8b8c8" shininess={40} />
      </mesh>

      {/* Left winglet */}
      <mesh position={[1.42, 0.05, 0.05]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.12, 0.015, 0.2]} />
        <meshPhongMaterial color="#98a8b8" shininess={40} />
      </mesh>
      {/* Right winglet */}
      <mesh position={[-1.42, 0.05, 0.05]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.12, 0.015, 0.2]} />
        <meshPhongMaterial color="#98a8b8" shininess={40} />
      </mesh>

      {/* Horizontal Stabilizer */}
      <mesh position={[0, 0.03, 0.82]}>
        <boxGeometry args={[0.85, 0.015, 0.16]} />
        <meshPhongMaterial color="#a8b8c8" shininess={40} />
      </mesh>

      {/* Vertical Stabilizer */}
      <mesh position={[0, 0.19, 0.78]}>
        <boxGeometry args={[0.015, 0.3, 0.22]} />
        <meshPhongMaterial color="#a8b8c8" shininess={40} />
      </mesh>

      {/* Cyan stripe on fuselage */}
      <mesh position={[0, 0.095, 0]}>
        <boxGeometry args={[0.003, 0.003, 1.4]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>

      {/* Cyan stripe on wings */}
      <mesh position={[0, 0.027, 0.05]}>
        <boxGeometry args={[2.5, 0.002, 0.002]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
    </group>
  );
}

/* ─────────────────────────────────────────────
   Ground grid lines
   ───────────────────────────────────────────── */
function GroundGrid() {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = [];
    const size = 10;
    const divisions = 20;
    const step = size / divisions;
    const half = size / 2;

    for (let i = 0; i <= divisions; i++) {
      const pos = -half + i * step;
      vertices.push(-half, 0, pos, half, 0, pos);
      vertices.push(pos, 0, -half, pos, 0, half);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={geometry} position={[0, -1.0, 0]}>
      <lineBasicMaterial color="#15253d" opacity={0.5} transparent />
    </lineSegments>
  );
}

/* ─────────────────────────────────────────────
   XYZ Axis lines using lineSegments
   ───────────────────────────────────────────── */
function AxisIndicator({ dir, color, length = 1.8 }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const end = dir.map(d => d * length);
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, ...end], 3));
    return geo;
  }, [dir, length]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={2} />
    </lineSegments>
  );
}

function AxisLines() {
  return (
    <group>
      <AxisIndicator dir={[1, 0, 0]} color="#ff4444" />
      <AxisIndicator dir={[0, 1, 0]} color="#4488ff" />
      <AxisIndicator dir={[0, 0, -1]} color="#44ff44" />
    </group>
  );
}

/* ─────────────────────────────────────────────
   Camera controller — auto-looks at origin
   ───────────────────────────────────────────── */
function CameraSetup() {
  useFrame(({ camera }) => {
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ─────────────────────────────────────────────
   Compass rose SVG overlay (memoized)
   ───────────────────────────────────────────── */
const CompassRose = React.memo(function CompassRose({ heading }) {
  const ticks = [];
  for (let i = 0; i < 360; i += 10) {
    const isMajor = i % 30 === 0;
    ticks.push(
      <line
        key={i}
        x1="50" y1={isMajor ? '5' : '7'}
        x2="50" y2="11"
        stroke={isMajor ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)'}
        strokeWidth={isMajor ? '1' : '0.5'}
        transform={`rotate(${i} 50 50)`}
      />
    );
  }

  const cardinals = [
    { label: 'N', angle: 0 },
    { label: 'E', angle: 90 },
    { label: 'S', angle: 180 },
    { label: 'W', angle: 270 },
  ];

  return (
    <div className="compass-container">
      <svg viewBox="0 0 100 100" className="compass-svg">
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

        <g transform={`rotate(${-heading} 50 50)`}>
          {ticks}
          <circle cx="50" cy="50" r="37" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
          {cardinals.map(c => {
            const rad = (c.angle - 90) * (Math.PI / 180);
            const x = 50 + Math.cos(rad) * 31;
            const y = 50 + Math.sin(rad) * 31;
            return (
              <text
                key={c.label}
                x={x} y={y}
                fill={c.label === 'N' ? '#ff4444' : 'rgba(255,255,255,0.55)'}
                fontSize="5.5"
                fontWeight="700"
                fontFamily="'Share Tech Mono', monospace"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${heading} ${x} ${y})`}
              >
                {c.label}
              </text>
            );
          })}
        </g>

        {/* Fixed heading indicator */}
        <polygon points="50,2 47.5,7.5 52.5,7.5" fill="#00e5ff" />

        {/* Heading value */}
        <text x="50" y="48" fill="#00e5ff" fontSize="11" fontWeight="700"
              fontFamily="'Share Tech Mono', monospace"
              textAnchor="middle" dominantBaseline="central">
          {Math.round(heading)}°
        </text>
      </svg>
    </div>
  );
});

/* ─────────────────────────────────────────────
   Main 3D UAV View Panel
   ───────────────────────────────────────────── */
export default function UAV3DView({ imuData, imuRef, hideHeader }) {
  return (
    <div className={`panel uav3d-panel ${hideHeader ? 'no-border no-padding' : ''}`} id="uav3d-panel" style={hideHeader ? { border: 'none', background: 'transparent' } : {}}>
      {!hideHeader && (
        <div className="panel-header">
          <span className="panel-header-dot blue" />
          <h2 className="panel-title">3D UAV VIEW</h2>
        </div>
      )}

      <div className="uav3d-content">
        <div className="uav3d-canvas-wrap">
          <Canvas
            gl={{ antialias: true, powerPreference: 'low-power' }}
            camera={{ position: [3, 2, 3], fov: 35, near: 0.1, far: 100 }}
            frameloop="always"
          >
            <CameraSetup />
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 8, 4]} intensity={1.8} color="#ffffff" />
            <directionalLight position={[-3, 4, -5]} intensity={0.5} color="#6688cc" />
            <hemisphereLight args={['#2244aa', '#0a0f1a', 0.3]} />

            <GroundGrid />
            <AxisLines />
            <FixedWingAircraft imuRef={imuRef} imuData={imuData} />
          </Canvas>

          {/* Axis labels overlay */}
          <div className="axis-label axis-x">X</div>
          <div className="axis-label axis-y">Z</div>
          <div className="axis-label axis-z">Y</div>
        </div>

        <div className="uav3d-sidebar">
          <CompassRose heading={imuData.yaw} />

          <div className="attitude-readouts">
            <div className="attitude-row">
              <span className="attitude-label">ROLL</span>
              <span className={`attitude-value ${imuData.roll < 0 ? 'cyan' : ''}`}>
                {imuData.roll.toFixed(1)}°
              </span>
            </div>
            <div className="attitude-row">
              <span className="attitude-label">PITCH</span>
              <span className="attitude-value">{imuData.pitch.toFixed(1)}°</span>
            </div>
            <div className="attitude-row">
              <span className="attitude-label">YAW</span>
              <span className="attitude-value cyan">{imuData.yaw.toFixed(1)}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
