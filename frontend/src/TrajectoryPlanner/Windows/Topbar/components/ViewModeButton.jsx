import React, { useState, useRef, useEffect } from 'react';
import { Item, RippleButton } from '../TopBar.styles';
import { useSelector, useDispatch } from 'react-redux';
import { setViewMode, setLayout, setViewPanel, toggleSplit, toggleControlPanel } from '../../../../Store/View';

/* ── Dropdown styling constants ──────────────────────────────── */
const dropStyle = {
  position: 'absolute',
  right: 0,
  top: '110%',
  background: '#0f1113',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  zIndex: 9500,
  minWidth: 200,
};

const btnBase = {
  background: 'transparent',
  color: '#cfd6ff',
  border: '1px solid rgba(255,255,255,0.06)',
  padding: '6px 10px',
  borderRadius: 6,
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: 12,
};

const btnActive = { ...btnBase, background: '#8f94fb', color: '#071023' };

const sectionLabel = {
  fontSize: 10,
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  padding: '6px 4px 2px',
};

const divider = { height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' };

/* ── Submenu for satellite body-frame views ──────────────────── */
const SatSubmenu = ({ side, currentConfig, onSelect }) => {
  const configs = useSelector(s => s.satellites.satellitesConfig) || [];
  if (!configs.length) return <div style={{ ...btnBase, opacity: 0.4, cursor: 'default' }}>No satellites</div>;
  return configs.map(sat => {
    const isActive = currentConfig?.type === 'bodyFrame' && currentConfig?.satelliteId === sat.id;
    return (
      <button
        key={sat.id}
        style={isActive ? btnActive : { ...btnBase, paddingLeft: 20 }}
        onClick={() => onSelect(side, { type: 'bodyFrame', satelliteId: sat.id })}
      >
        🛰️ {sat.name || `Sat ${sat.id}`}
      </button>
    );
  });
};

const ViewModeButton = ({ currentViewMode, onChange, handleRipple, showControlPanel, onToggleControlPanel }) => {
  const [open, setOpen] = useState(false);
  const [subSide, setSubSide] = useState(null); // which side's sat submenu is open
  const dispatch = useDispatch();
  const layout = useSelector(s => s.view.layout) || { mode: 'single', left: { type: '3d' }, right: null };
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handlePanel = (side, config) => {
    dispatch(setViewPanel({ side, config }));
    // Keep viewMode in sync for legacy rendering
    if (layout.mode === 'single') {
      if (config.type === '3d') dispatch(setViewMode('globe'));
      else if (config.type === '2d') dispatch(setViewMode('map'));
    }
    setSubSide(null);
  };

  const handleLayoutMode = (mode) => {
    if (mode === 'single') {
      dispatch(setLayout({ mode: 'single', left: layout.left, right: null }));
      // Sync legacy viewMode
      if (layout.left.type === '3d') dispatch(setViewMode('globe'));
      else if (layout.left.type === '2d') dispatch(setViewMode('map'));
    } else {
      dispatch(setLayout({
        mode: 'split',
        left: layout.left,
        right: layout.right || { type: '2d' },
      }));
      dispatch(setViewMode('both'));
    }
  };

  const renderPanelSection = (side, label) => {
    const config = layout[side];
    if (layout.mode === 'single' && side === 'right') return null;
    return (
      <>
        <div style={sectionLabel}>{label}</div>
        <button
          style={config?.type === '3d' ? btnActive : btnBase}
          onClick={() => handlePanel(side, { type: '3d' })}
        >
          🌍 3D Globe
        </button>
        <button
          style={config?.type === '2d' ? btnActive : btnBase}
          onClick={() => handlePanel(side, { type: '2d' })}
        >
          🗺️ 2D Map
        </button>
        <button
          style={config?.type === 'bodyFrame' ? btnActive : { ...btnBase, display: 'flex', justifyContent: 'space-between' }}
          onClick={() => setSubSide(subSide === side ? null : side)}
        >
          🛰️ Satellite View ▸
        </button>
        {subSide === side && <SatSubmenu side={side} currentConfig={config} onSelect={handlePanel} />}
      </>
    );
  };

  return (
    <Item style={{ position: 'relative' }} ref={ref}>
      <RippleButton
        onMouseDown={handleRipple}
        onClick={() => setOpen(v => !v)}
        title="Switch view"
        aria-label="Switch view"
      >
        View
      </RippleButton>
      {open && (
        <div style={dropStyle}>
          {/* Layout mode */}
          <div style={sectionLabel}>Layout</div>
          <button
            style={layout.mode === 'single' ? btnActive : btnBase}
            onClick={() => handleLayoutMode('single')}
          >
            Full Screen
          </button>
          <button
            style={layout.mode === 'split' ? btnActive : btnBase}
            onClick={() => handleLayoutMode('split')}
          >
            Split (Left / Right)
          </button>

          <div style={divider} />

          {/* Panel selectors */}
          {renderPanelSection('left', layout.mode === 'single' ? 'View Type' : 'Left Panel')}

          {layout.mode === 'split' && (
            <>
              <div style={divider} />
              {renderPanelSection('right', 'Right Panel')}
            </>
          )}

          <div style={divider} />

          {/* Control panel toggle */}
          <button
            onClick={() => onToggleControlPanel?.()}
            style={{ ...btnBase, display: 'flex', alignItems: 'center', gap: 8 }}
            aria-label="Toggle Control Panel"
          >
            <span style={{ width: 16, textAlign: 'center' }}>{showControlPanel ? '✓' : ''}</span>
            Control Panel
          </button>
        </div>
      )}
    </Item>
  );
};

export default ViewModeButton;