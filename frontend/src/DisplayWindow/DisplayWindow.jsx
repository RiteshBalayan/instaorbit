/**
 * DisplayWindow — "Daughter" display tab.
 *
 * This is a lightweight, view-only screen designed to be opened in a
 * separate browser tab/window.  It receives its Redux state from the
 * master tab via BroadcastChannel, so it has NO controls for simulation,
 * satellite config, etc.
 *
 * It provides:
 *   • A compact top bar to pick the view (3D globe, 2D map, Body Frame,
 *     split-screen) plus a satellite selector for body-frame mode.
 *   • A full-screen render area below.
 */

import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Canvas } from '@react-three/fiber';
import GlobeRender from '../TrajectoryPlanner/Render/GlobeRender';
import LeafletMapRender from '../TrajectoryPlanner/Render/LeafletMapRender';
import BodyFrameView from '../TrajectoryPlanner/Render/BodyFrameView';
import ErrorBoundary from '../components/ErrorBoundary';
import LinkEngine from '../TrajectoryPlanner/Windows/Sidebar/LinkEngine';
import './DisplayWindow.css';

/* ── Small ViewPanel reused from Globe.jsx pattern ────────── */
function ViewPanel({ config }) {
  if (!config) return null;
  switch (config.type) {
    case '3d':
      return (
        <ErrorBoundary fallbackMessage="Globe view failed to render.">
          <Canvas gl={{ preserveDrawingBuffer: true }}>
            <GlobeRender />
          </Canvas>
        </ErrorBoundary>
      );
    case '2d':
      return (
        <div style={{ flex: 1, width: '100%', height: '100%' }}>
          <ErrorBoundary fallbackMessage="Map view failed to render.">
            <LeafletMapRender />
          </ErrorBoundary>
        </div>
      );
    case 'bodyFrame':
      return (
        <ErrorBoundary fallbackMessage="Body frame view failed to render.">
          <BodyFrameView satelliteId={config.satelliteId} />
        </ErrorBoundary>
      );
    default:
      return null;
  }
}

/* ── Main component ────────────────────────────────────────── */
const DisplayWindow = () => {
  const satellites = useSelector(s => s.satellites.satellitesConfig) || [];
  const currentSats = useSelector(s => s.CurrentState.satelite) || [];

  /* Layout state local to this daughter window */
  const [mode, setMode] = useState('single');          // 'single' | 'split'
  const [leftView, setLeftView] = useState({ type: '3d' });
  const [rightView, setRightView] = useState({ type: '2d' });

  /* All known satellite ids (union of configs + currentState) */
  const satOptions = useMemo(() => {
    const ids = new Set();
    satellites.forEach(s => ids.add(s.id));
    currentSats.forEach(s => ids.add(s.id));
    return [...ids];
  }, [satellites, currentSats]);

  const handleViewChange = (side, type) => {
    const cfg = type === 'bodyFrame'
      ? { type: 'bodyFrame', satelliteId: satOptions[0] ?? 0 }
      : { type };
    if (side === 'left') setLeftView(cfg);
    else setRightView(cfg);
  };

  const handleSatChange = (side, satId) => {
    const cfg = { type: 'bodyFrame', satelliteId: Number(satId) };
    if (side === 'left') setLeftView(cfg);
    else setRightView(cfg);
  };

  return (
    <div className="display-window">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="display-topbar">
        <span className="display-logo">InstaOrbit · Display</span>

        <div className="display-divider" />

        {/* Left panel controls */}
        <div className="display-panel-group">
          {mode === 'split' && <span className="display-panel-label">LEFT</span>}
          <button
            className={`display-btn${leftView.type === '3d' ? ' active' : ''}`}
            onClick={() => handleViewChange('left', '3d')}
          >🌐 3D Globe</button>
          <button
            className={`display-btn${leftView.type === '2d' ? ' active' : ''}`}
            onClick={() => handleViewChange('left', '2d')}
          >🗺️ 2D Map</button>
          <button
            className={`display-btn${leftView.type === 'bodyFrame' ? ' active' : ''}`}
            onClick={() => handleViewChange('left', 'bodyFrame')}
          >🛰️ Body Frame</button>
          {leftView.type === 'bodyFrame' && (
            <select
              className="display-sat-select"
              value={leftView.satelliteId ?? ''}
              onChange={e => handleSatChange('left', e.target.value)}
            >
              {satOptions.map(id => {
                const cfg = satellites.find(s => s.id === id);
                return <option key={id} value={id}>{cfg?.name || `Sat ${id}`}</option>;
              })}
            </select>
          )}
        </div>

        <div className="display-divider" />

        {/* Split toggle */}
        <button
          className={`display-btn${mode === 'split' ? ' active' : ''}`}
          onClick={() => setMode(m => m === 'single' ? 'split' : 'single')}
        >
          {mode === 'split' ? '◻ Single' : '◫ Split'}
        </button>

        {/* Right panel controls (only in split mode) */}
        {mode === 'split' && (
          <>
            <div className="display-divider" />
            <div className="display-panel-group">
              <span className="display-panel-label">RIGHT</span>
              <button
                className={`display-btn${rightView.type === '3d' ? ' active' : ''}`}
                onClick={() => handleViewChange('right', '3d')}
              >🌐 3D</button>
              <button
                className={`display-btn${rightView.type === '2d' ? ' active' : ''}`}
                onClick={() => handleViewChange('right', '2d')}
              >🗺️ 2D</button>
              <button
                className={`display-btn${rightView.type === 'bodyFrame' ? ' active' : ''}`}
                onClick={() => handleViewChange('right', 'bodyFrame')}
              >🛰️ Body</button>
              {rightView.type === 'bodyFrame' && (
                <select
                  className="display-sat-select"
                  value={rightView.satelliteId ?? ''}
                  onChange={e => handleSatChange('right', e.target.value)}
                >
                  {satOptions.map(id => {
                    const cfg = satellites.find(s => s.id === id);
                    return <option key={id} value={id}>{cfg?.name || `Sat ${id}`}</option>;
                  })}
                </select>
              )}
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        <span className="display-hint">Controlled by master tab</span>
      </div>

      {/* ── Render area ──────────────────────────────────────── */}
      <div className="display-render-area">
        {/* Headless link engine for link line calculations */}
        <LinkEngine />

        {mode === 'split' ? (
          <div className="display-split-container">
            <div className="display-split-pane">
              <ViewPanel config={leftView} />
            </div>
            <div className="display-split-divider" />
            <div className="display-split-pane">
              <ViewPanel config={rightView} />
            </div>
          </div>
        ) : (
          <ViewPanel config={leftView} />
        )}
      </div>
    </div>
  );
};

export default DisplayWindow;
