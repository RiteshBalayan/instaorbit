/**
 * MenuBar — Horizontal action bar below the TopBar.
 *
 * Provides quick-access buttons for the most important actions:
 *   • Add Satellite
 *   • Add Ground Station
 *   • Add Constellation (Walker)
 *   • Configure Link
 *   • Configuration (toggles the RightToolbar flyout panel)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dialog, DialogContent, Button, TextField, Box } from '@mui/material';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import CellTowerIcon from '@mui/icons-material/CellTower';
import PublicIcon from '@mui/icons-material/Public';
import LinkIcon from '@mui/icons-material/Link';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';

import { toggleConfigPanel } from '../../../Store/View';
import { updateRenderTime } from '../../../Store/timeSlice';
import { addGroundStation, updateGroundStation, deleteGroundStation } from '../../../Store/groundStationSlice';
import AddSatellite from '../Sidebar/AddSatellite';
import AddConstellation from '../Sidebar/AddConstellation';
import LinkManager from '../Sidebar/LinkManager';

/* tiny map-click helper */
const MapClickSelector = ({ onSelect }) => {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
};

const MenuBar = () => {
  const dispatch = useDispatch();
  const showControlPanel = useSelector((s) => s.view.showControlPanel);
  const showConfigPanel = useSelector((s) => s.view.showConfigPanel);
  const groundStations = useSelector((s) => s.groundStations.groundStations);
  const particles = useSelector((s) => s.particles.particles) || [];
  const RenderTime = useSelector((s) => s.timer.RenderTime);

  /* ── Render playback (menu bar mirror of analysis-panel controls) ─── */
  const [renderPlaying, setRenderPlaying] = useState(false);
  const [renderSpeed, setRenderSpeed] = useState(1);
  const [noDataToast, setNoDataToast] = useState(false);
  const renderIntervalRef = useRef(null);

  const maxSimTime = particles.reduce((mx, p) => {
    if (!p.tracePoints?.length) return mx;
    const last = p.tracePoints[p.tracePoints.length - 1];
    return Math.max(mx, last.time ?? 0);
  }, 0);
  const hasSimData = maxSimTime > 0;

  const guardNoData = useCallback(() => {
    if (!hasSimData) {
      setNoDataToast(true);
      setTimeout(() => setNoDataToast(false), 3000);
      return true;
    }
    return false;
  }, [hasSimData]);

  useEffect(() => {
    clearInterval(renderIntervalRef.current);
    if (!renderPlaying) return;
    const FPS = 30;
    const tickMs = Math.round(1000 / FPS);          // ~33 ms
    const stepPerTick = renderSpeed / FPS;            // sim-seconds per frame

    renderIntervalRef.current = setInterval(() => {
      dispatch((_, getState) => {
        const state = getState();
        const crt = state.timer.RenderTime;
        const pts = state.particles.particles || [];
        const mx = pts.reduce((m, p) => {
          if (!p.tracePoints?.length) return m;
          return Math.max(m, p.tracePoints[p.tracePoints.length - 1].time ?? 0);
        }, 0);
        if (crt >= mx && mx > 0) { setRenderPlaying(false); return; }
        dispatch(updateRenderTime(Math.round(Math.min(crt + stepPerTick, mx) * 1000) / 1000));
      });
    }, tickMs);
    return () => clearInterval(renderIntervalRef.current);
  }, [renderPlaying, renderSpeed, dispatch]);

  useEffect(() => {
    if (!hasSimData && renderPlaying) setRenderPlaying(false);
  }, [hasSimData, renderPlaying]);

  const handleRenderPlayPause = () => {
    if (guardNoData()) return;
    setRenderPlaying(prev => !prev);
  };
  const handleRenderRewind = () => {
    if (guardNoData()) return;
    dispatch(updateRenderTime(Math.round(Math.max(0, RenderTime - renderSpeed) * 1000) / 1000));
  };
  const handleRenderFF = () => {
    if (guardNoData()) return;
    dispatch(updateRenderTime(Math.round(Math.min(RenderTime + renderSpeed * 10, maxSimTime) * 1000) / 1000));
  };

  /* ── Satellite modal ──────────────────────────────────────── */
  const [showSatModal, setShowSatModal] = useState(false);

  /* ── Constellation modal ──────────────────────────────────── */
  const [showConstellationModal, setShowConstellationModal] = useState(false);

  /* ── Link Manager modal ───────────────────────────────────── */
  const [showLinkManager, setShowLinkManager] = useState(false);

  /* ── Ground Station modal ─────────────────────────────────── */
  const [showGSModal, setShowGSModal] = useState(false);
  const [gsName, setGsName] = useState('New Ground Station');
  const [gsLat, setGsLat] = useState(0);
  const [gsLon, setGsLon] = useState(0);
  const [gsAlt, setGsAlt] = useState(0.1);
  const [mapCenter, setMapCenter] = useState([0, 0]);

  const handleAddGS = () => {
    dispatch(addGroundStation({
      id: `gs-${Date.now()}`,
      name: gsName || 'Ground Station',
      lat: Number(gsLat) || 0,
      lon: Number(gsLon) || 0,
      altKm: Number(gsAlt) || 0,
    }));
    setShowGSModal(false);
  };

  const openGsModal = () => {
    setGsName('New Ground Station');
    setGsLat(0);
    setGsLon(0);
    setGsAlt(0.1);
    setMapCenter([0, 0]);
    setShowGSModal(true);
  };

  /* ── Dialog styles ────────────────────────────────────────── */
  const dialogPaperSx = {
    backgroundColor: '#fff',
    color: '#1a1a2e',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  };
  const textFieldSx = {
    '& .MuiInputLabel-root': { color: '#555' },
    '& .MuiOutlinedInput-root': {
      color: '#1a1a2e',
      '& fieldset': { borderColor: '#d1d5db' },
      '&:hover fieldset': { borderColor: '#9ca3af' },
      '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
    },
  };

  return (
    <>
      {/* ═══ MENU BAR ═══════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        paddingLeft: showControlPanel ? 102 : 10,
        background: 'linear-gradient(90deg, #1a1c2e 0%, #2a2d4a 100%)',
        borderBottom: '1px solid rgba(143,148,251,0.15)',
        zIndex: 8999,
        flexShrink: 0,
        transition: 'padding-left 0.2s ease',
      }}>
        {/* Add Satellite */}
        <button onClick={() => setShowSatModal(true)} style={btnStyle}>
          <SatelliteAltIcon sx={{ fontSize: 14 }} />
          <span>Add Satellite</span>
        </button>

        {/* Add Ground Station */}
        <button onClick={openGsModal} style={btnStyle}>
          <CellTowerIcon sx={{ fontSize: 14 }} />
          <span>Add Ground Station</span>
        </button>

        {/* Add Constellation (Walker) */}
        <button onClick={() => setShowConstellationModal(true)} style={btnStyle}>
          <PublicIcon sx={{ fontSize: 14 }} />
          <span>Add Constellation</span>
        </button>

        {/* Configure Link */}
        <button onClick={() => setShowLinkManager(true)} style={btnStyle}>
          <LinkIcon sx={{ fontSize: 14 }} />
          <span>Configure Link</span>
        </button>

        <div style={{ width: 1, height: 18, background: 'rgba(143,148,251,0.25)', margin: '0 2px' }} />

        {/* Configuration */}
        <button
          onClick={() => dispatch(toggleConfigPanel())}
          style={{
            ...btnStyle,
            background: showConfigPanel ? 'rgba(138,130,251,0.35)' : 'rgba(138,130,251,0.08)',
            color: showConfigPanel ? '#fff' : '#c4c8f0',
          }}
        >
          <SettingsIcon sx={{ fontSize: 14 }} />
          <span>Configuration</span>
        </button>

        {/* ── Render controls separator ────────────────────── */}
        <div style={{ width: 1, height: 18, background: 'rgba(143,148,251,0.25)', margin: '0 6px' }} />

        {/* RENDER label */}
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: 1.2,
          color: '#0078D7', userSelect: 'none', whiteSpace: 'nowrap',
        }}>
          RENDER
        </span>

        {/* Rewind */}
        <button onClick={handleRenderRewind} style={renderBtnStyle} title="Rewind render">
          <FastRewindIcon sx={{ fontSize: 13 }} />
        </button>

        {/* Render Play / Pause */}
        <button
          onClick={handleRenderPlayPause}
          style={{
            ...renderBtnStyle,
            background: renderPlaying ? 'rgba(0,180,120,0.25)' : 'rgba(0,120,215,0.12)',
            borderColor: renderPlaying ? '#00b478' : 'rgba(0,120,215,0.4)',
            color: renderPlaying ? '#00ffaa' : '#0078D7',
            opacity: hasSimData ? 1 : 0.4,
          }}
          title={renderPlaying ? 'Pause render' : 'Play render'}
        >
          {renderPlaying ? <PauseIcon sx={{ fontSize: 13 }} /> : <PlayArrowIcon sx={{ fontSize: 13 }} />}
        </button>

        {/* Fast forward */}
        <button onClick={handleRenderFF} style={renderBtnStyle} title="Fast forward render">
          <FastForwardIcon sx={{ fontSize: 13 }} />
        </button>

        {/* Render-only hint */}
        <span style={{
          fontSize: 8, color: 'rgba(200,200,255,0.35)',
          fontStyle: 'italic', whiteSpace: 'nowrap', userSelect: 'none',
        }}>
          render only · run SIM first
        </span>

        {/* No-data toast */}
        {noDataToast && (
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            marginTop: 4, background: 'rgba(255,80,60,0.92)', color: '#fff',
            fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
            whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', zIndex: 200,
          }}>
            ⚠️ No simulation data — run SIM first
          </span>
        )}
      </div>

      {/* ═══ DIALOGS ════════════════════════════════════════════ */}

      {/* Add Satellite */}
      <Dialog
        open={showSatModal}
        onClose={() => setShowSatModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { ...dialogPaperSx, maxWidth: 520 } }}
      >
        <div style={dialogHeaderStyle}>
          <span style={dialogTitleStyle}>
            <SatelliteAltIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
            Add Satellite
          </span>
          <button style={dialogCloseStyle} onClick={() => setShowSatModal(false)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
        <DialogContent sx={{ p: 0 }}>
          <AddSatellite editId={null} onClose={() => setShowSatModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Add Ground Station */}
      <Dialog
        open={showGSModal}
        onClose={() => setShowGSModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { ...dialogPaperSx, maxWidth: 480 } }}
      >
        <div style={dialogHeaderStyle}>
          <span style={dialogTitleStyle}>
            <CellTowerIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
            Add Ground Station
          </span>
          <button style={dialogCloseStyle} onClick={() => setShowGSModal(false)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
        <DialogContent sx={{ p: '16px 20px' }}>
          <Box display="flex" flexDirection="column" gap={1.5}>
            <Box sx={{ height: 220, border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <MapContainer center={mapCenter} zoom={2} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickSelector onSelect={(lat, lon) => { setGsLat(lat.toFixed(4)); setGsLon(lon.toFixed(4)); setMapCenter([lat, lon]); }} />
                {groundStations.map((gs) => (
                  <CircleMarker key={gs.id} center={[gs.lat, gs.lon]} radius={5} pathOptions={{ color: '#7dd3fc', fillColor: '#38bdf8', fillOpacity: 0.8 }} />
                ))}
                <CircleMarker center={[parseFloat(gsLat) || 0, parseFloat(gsLon) || 0]} radius={6} pathOptions={{ color: '#f97316', fillColor: '#fb923c', fillOpacity: 0.8 }} />
              </MapContainer>
            </Box>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
              <TextField label="Name" size="small" value={gsName} onChange={(e) => setGsName(e.target.value)} fullWidth sx={textFieldSx} />
              <TextField label="Altitude (km)" size="small" type="number" value={gsAlt} onChange={(e) => setGsAlt(e.target.value)} fullWidth sx={textFieldSx} />
              <TextField label="Latitude (°)" size="small" type="number" value={gsLat} onChange={(e) => setGsLat(e.target.value)} fullWidth sx={textFieldSx} />
              <TextField label="Longitude (°)" size="small" type="number" value={gsLon} onChange={(e) => setGsLon(e.target.value)} fullWidth sx={textFieldSx} />
            </Box>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button size="small" variant="contained" onClick={handleAddGS}>Add</Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Walker Constellation */}
      <Dialog
        open={showConstellationModal}
        onClose={() => setShowConstellationModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { ...dialogPaperSx, maxWidth: 520 } }}
      >
        <div style={dialogHeaderStyle}>
          <span style={dialogTitleStyle}>
            <PublicIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            Walker Constellation
          </span>
          <button style={dialogCloseStyle} onClick={() => setShowConstellationModal(false)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
        <DialogContent sx={{ p: 0 }}>
          <AddConstellation onClose={() => setShowConstellationModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Link Manager */}
      <Dialog
        open={showLinkManager}
        onClose={() => setShowLinkManager(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { ...dialogPaperSx, maxWidth: 560, maxHeight: '80vh' } }}
      >
        <div style={dialogHeaderStyle}>
          <span style={dialogTitleStyle}>
            <LinkIcon sx={{ fontSize: 18, color: '#10b981' }} />
            Link Manager
          </span>
          <button style={dialogCloseStyle} onClick={() => setShowLinkManager(false)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
        <DialogContent sx={{ p: '12px 16px' }}>
          <LinkManager />
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ─── Inline styles ─────────────────────────────────────────── */
const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: 'rgba(138,130,251,0.08)',
  border: '1px solid rgba(138,130,251,0.35)',
  color: '#c4c8f0',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: "'Inter', 'Roboto', sans-serif",
  padding: '4px 10px',
  borderRadius: 5,
  cursor: 'pointer',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
};

const renderBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,120,215,0.08)',
  border: '1px solid rgba(0,120,215,0.3)',
  color: '#0078D7',
  width: 24,
  height: 22,
  borderRadius: 4,
  cursor: 'pointer',
  transition: 'all 0.15s',
  padding: 0,
};

const dialogHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
};

const dialogTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 600,
  fontSize: 14,
};

const dialogCloseStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#6b7280',
  padding: 4,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
};

export default MenuBar;
