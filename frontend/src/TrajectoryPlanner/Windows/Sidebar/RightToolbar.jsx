/**
 * RightToolbar — Photoshop-style right-edge icon strip + flyout config panel
 *
 * Icon strip (42 px, always visible):
 *   Quick actions : Add Satellite, Add Ground Station
 *   Scene toggles : Reference Frame, Track Horizon, Orbital Rings,
 *                   HD Earth, Sun, Ambient Light, Link Lines, Van Allen Belt
 *   Overlays      : Grid, Axis
 *   Config toggle : Opens the flyout configuration panel
 *
 * Flyout config panel (320 px, slides from the strip):
 *   Satellites, Ground Stations, Links — full CRUD management.
 */

import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Tooltip, Dialog, DialogContent, Button, TextField, Typography, Box } from '@mui/material';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// MUI icons
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import CellTowerIcon from '@mui/icons-material/CellTower';
import PublicIcon from '@mui/icons-material/Public';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import TripOriginIcon from '@mui/icons-material/TripOrigin';
import LightModeIcon from '@mui/icons-material/LightMode';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ShieldIcon from '@mui/icons-material/Shield';
import LinkIcon from '@mui/icons-material/Link';
import GridOnIcon from '@mui/icons-material/GridOn';
import StraightenIcon from '@mui/icons-material/Straighten';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Store
import {
  toggleGrid,
  toggleAxis,
  toggleVonAllenBelt,
  toggleHDEarth,
  toggleSun,
  toggleAmbientLight,
  toggleRefrenaceSystem,
  toggleConfigPanel,
  setTrackWindow,
  setShowOrbit,
  setShowLinkLines,
} from '../../../Store/View';
import { deleteSatellite } from '../../../Store/satelliteSlice';
import { deleteParticle } from '../../../Store/StateTimeSeries';
import { deleteState } from '../../../Store/CurrentState';
import { addGroundStation, updateGroundStation, deleteGroundStation } from '../../../Store/groundStationSlice';

// Child components (reuse existing)
import AddSatellite from './AddSatellite';
import AddConstellation from './AddConstellation';
import LinkManager from './LinkManager';

import './RightToolbar.css';

/* ─── tiny map-click helper (reused from old UtilityPanel) ──── */
const MapClickSelector = ({ onSelect }) => {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) });
  return null;
};

const RightToolbar = () => {
  const dispatch = useDispatch();

  /* ── Redux selectors ──────────────────────────────────────── */
  const view = useSelector((s) => s.view);
  const satellites = useSelector((s) => s.satellites.satellitesConfig);
  const groundStations = useSelector((s) => s.groundStations.groundStations);
  const savedLinks = useSelector((s) => s.communication.links);

  /* ── Local UI state ───────────────────────────────────────── */
  const configOpen = useSelector((s) => s.view.showConfigPanel);
  const setConfigOpen = (val) => {
    const next = typeof val === 'function' ? val(configOpen) : val;
    if (next !== configOpen) dispatch(toggleConfigPanel());
  };
  const [openSection, setOpenSection] = useState(null); // 'satellites' | 'gs' | 'links' | null
  const [showSatModal, setShowSatModal] = useState(false);
  const [editingSatId, setEditingSatId] = useState(null);
  const [showConstellationModal, setShowConstellationModal] = useState(false);
  const [showGSModal, setShowGSModal] = useState(false);
  const [editingGsId, setEditingGsId] = useState(null);
  const [gsName, setGsName] = useState('New Ground Station');
  const [gsLat, setGsLat] = useState(0);
  const [gsLon, setGsLon] = useState(0);
  const [gsAlt, setGsAlt] = useState(0.1);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [showLinkManager, setShowLinkManager] = useState(false);

  /* ── Accordion toggle helper ──────────────────────────────── */
  const toggleSection = (name) => setOpenSection((p) => (p === name ? null : name));

  /* ── Scene toggle helpers ─────────────────────────────────── */
  const refIsInertial = view.ReferenceSystem === 'EarthInertial';
  const handleRefToggle = useCallback(() => {
    dispatch(toggleRefrenaceSystem(refIsInertial ? 'EarthFixed' : 'EarthInertial'));
  }, [refIsInertial, dispatch]);

  /* ── Ground-station modal helpers ─────────────────────────── */
  const openGsModal = (id = null) => {
    if (id !== null) {
      const gs = groundStations.find((g) => g.id === id);
      if (gs) { setGsName(gs.name); setGsLat(gs.lat); setGsLon(gs.lon); setGsAlt(gs.altKm); setMapCenter([gs.lat, gs.lon]); }
    } else {
      setGsName('New Ground Station'); setGsLat(0); setGsLon(0); setGsAlt(0.1);
    }
    setEditingGsId(id);
    setShowGSModal(true);
  };

  const handleAddGS = () => {
    if (editingGsId !== null) {
      dispatch(updateGroundStation({ id: editingGsId, changes: { name: gsName || 'Ground Station', lat: Number(gsLat) || 0, lon: Number(gsLon) || 0, altKm: Number(gsAlt) || 0 } }));
    } else {
      dispatch(addGroundStation({ id: `gs-${Date.now()}`, name: gsName || 'Ground Station', lat: Number(gsLat) || 0, lon: Number(gsLon) || 0, altKm: Number(gsAlt) || 0 }));
    }
    setShowGSModal(false);
  };

  /* ── Endpoint name resolver (for link display) ────────────── */
  const getEndpointName = (id) => {
    if (!id) return id;
    if (id.startsWith('sat-')) {
      const numericId = parseFloat(id.replace('sat-', ''));
      const sat = satellites.find((s) => s.id === numericId);
      return sat?.name || `Satellite ${numericId}`;
    }
    const gs = groundStations.find((g) => g.id === id);
    return gs?.name || id;
  };

  /* ═══════════════════════════════════════════════════════════
   *  ICON DEFINITIONS — each group is separated by a divider
   * ═══════════════════════════════════════════════════════════ */
  const quickActions = [];

  const sceneToggles = [
    { tip: refIsInertial ? 'Frame: ECI (click → ECEF)' : 'Frame: ECEF (click → ECI)',
      icon: <LanguageIcon />, active: !refIsInertial, onClick: handleRefToggle },
    { tip: 'Track Horizon',  icon: <TrackChangesIcon />, active: view.trackWindow,  onClick: () => dispatch(setTrackWindow(!view.trackWindow)) },
    { tip: 'Orbital Rings',  icon: <TripOriginIcon />,   active: view.showOrbit,    onClick: () => dispatch(setShowOrbit(!view.showOrbit)) },
    { tip: 'HD Earth',       icon: <PublicIcon />,        active: view.HDEarth,      onClick: () => dispatch(toggleHDEarth(!view.HDEarth)) },
    { tip: 'Sun',            icon: <WbSunnyIcon />,       active: view.Sun,          onClick: () => dispatch(toggleSun(!view.Sun)) },
    { tip: 'Ambient Light',  icon: <LightbulbIcon />,     active: view.AmbientLight, onClick: () => dispatch(toggleAmbientLight(!view.AmbientLight)) },
    { tip: 'Link Lines',     icon: <LinkIcon />,          active: view.showLinkLines !== false, onClick: () => dispatch(setShowLinkLines(!(view.showLinkLines !== false))) },
    { tip: 'Van Allen Belt', icon: <ShieldIcon />,        active: view.VonAllenBelt, onClick: () => dispatch(toggleVonAllenBelt(!view.VonAllenBelt)) },
  ];

  const overlayToggles = [
    { tip: 'Grid',  icon: <GridOnIcon />,     active: view.Grid, onClick: () => dispatch(toggleGrid(!view.Grid)) },
    { tip: 'Axis',  icon: <StraightenIcon />, active: view.Axis, onClick: () => dispatch(toggleAxis(!view.Axis)) },
  ];

  /* helper to render a single icon button */
  const IconBtn = ({ tip, icon, active, accent, onClick }) => (
    <Tooltip title={tip} placement="left" arrow>
      <button
        className={`rt-icon-btn${active ? ' active' : ''}${accent ? ' rt-icon-btn--accent' : ''}`}
        onClick={onClick}
      >
        {icon}
      </button>
    </Tooltip>
  );

  /* ═══════════════════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════════════════ */

  /* Uniform light-theme dialog styles */
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
      {/* ═══ ICON STRIP ═══════════════════════════════════════ */}
      <div className="rt-strip">
        {/* Scene toggles */}
        {sceneToggles.map((a, i) => <IconBtn key={`s${i}`} {...a} />)}

        <div className="rt-divider" />

        {/* Overlay toggles */}
        {overlayToggles.map((a, i) => <IconBtn key={`o${i}`} {...a} />)}

        <div className="rt-divider" />
      </div>

      {/* ═══ CONFIG FLYOUT ════════════════════════════════════ */}
      {configOpen && (
        <div className="rt-config-panel">
          <div className="rt-config-header">
            <span className="rt-config-title">Configuration</span>
            <button className="rt-config-close" onClick={() => setConfigOpen(false)}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
          <div className="rt-config-body">

            {/* ── Satellites (collapsible) ──────────────── */}
            <div className="rt-section">
              <div className="rt-section-header" onClick={() => toggleSection('satellites')}>
                <span className="rt-section-header-left">
                  <span className="rt-section-chevron">{openSection === 'satellites' ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}</span>
                  <SatelliteAltIcon sx={{ fontSize: 15, color: '#3b82f6' }} />
                  <span className="rt-section-title">Satellites</span>
                  <span className="rt-section-count">{satellites.length}</span>
                </span>
                <div className="rt-section-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="rt-small-btn rt-small-btn--primary" onClick={() => { setEditingSatId(null); setShowSatModal(true); }}>+ Add</button>
                  <button className="rt-small-btn" onClick={() => setShowConstellationModal(true)}>Walker</button>
                </div>
              </div>
              {openSection === 'satellites' && (
                <div className="rt-section-body">
                  {satellites.length === 0 && <div className="rt-empty">No satellites added</div>}
                  {satellites.map((sat) => (
                    <div key={sat.id} className="rt-item-row">
                      <span className="rt-item-color" style={{ background: sat.color || '#4fc3f7' }} />
                      <span className="rt-item-name">{sat.name || `Satellite ${sat.id}`}</span>
                      <div className="rt-item-actions">
                        <button className="rt-small-btn" onClick={() => { setEditingSatId(sat.id); setShowSatModal(true); }}>Edit</button>
                        <button className="rt-small-btn rt-small-btn--danger" onClick={() => { dispatch(deleteSatellite(sat.id)); dispatch(deleteParticle(sat.id)); dispatch(deleteState(sat.id)); }}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Ground Stations (collapsible) ────────── */}
            <div className="rt-section">
              <div className="rt-section-header" onClick={() => toggleSection('gs')}>
                <span className="rt-section-header-left">
                  <span className="rt-section-chevron">{openSection === 'gs' ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}</span>
                  <CellTowerIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
                  <span className="rt-section-title">Ground Stations</span>
                  <span className="rt-section-count">{groundStations.length}</span>
                </span>
                <div className="rt-section-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="rt-small-btn rt-small-btn--primary" onClick={() => openGsModal(null)}>+ Add</button>
                </div>
              </div>
              {openSection === 'gs' && (
                <div className="rt-section-body">
                  {groundStations.length === 0 && <div className="rt-empty">No stations added</div>}
                  {groundStations.map((gs) => (
                    <div key={gs.id} className="rt-item-row">
                      <span className="rt-item-color" style={{ background: '#f59e0b' }} />
                      <span className="rt-item-name">{gs.name}</span>
                      <span className="rt-item-sub">{Number(gs.lat).toFixed(1)}°, {Number(gs.lon).toFixed(1)}°</span>
                      <div className="rt-item-actions">
                        <button className="rt-small-btn" onClick={() => openGsModal(gs.id)}>Edit</button>
                        <button className="rt-small-btn rt-small-btn--danger" onClick={() => dispatch(deleteGroundStation(gs.id))}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Links (collapsible) ─────────────────── */}
            <div className="rt-section">
              <div className="rt-section-header" onClick={() => toggleSection('links')}>
                <span className="rt-section-header-left">
                  <span className="rt-section-chevron">{openSection === 'links' ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}</span>
                  <LinkIcon sx={{ fontSize: 15, color: '#10b981' }} />
                  <span className="rt-section-title">Links</span>
                  <span className="rt-section-count">{savedLinks.length}</span>
                </span>
                <div className="rt-section-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="rt-small-btn rt-small-btn--primary" onClick={() => setShowLinkManager(true)}>Manage</button>
                </div>
              </div>
              {openSection === 'links' && (
                <div className="rt-section-body">
                  {savedLinks.length === 0 && <div className="rt-empty">No links configured</div>}
                  {savedLinks.map((link) => (
                    <div key={link.id} className="rt-item-row">
                      <span className="rt-item-name">{getEndpointName(link.txId)} → {getEndpointName(link.rxId)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ═══ DIALOGS — Uniform compact light-theme ═══════════ */}

      {/* Add / Edit Satellite */}
      <Dialog
        open={showSatModal}
        onClose={() => setShowSatModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { ...dialogPaperSx, maxWidth: 520 } }}
      >
        <div className="rt-dialog-header">
          <span className="rt-dialog-title">
            <SatelliteAltIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
            {editingSatId !== null ? 'Edit Satellite' : 'Add Satellite'}
          </span>
          <button className="rt-dialog-close" onClick={() => setShowSatModal(false)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
        <DialogContent sx={{ p: 0 }}>
          <AddSatellite editId={editingSatId} onClose={() => setShowSatModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Ground Station */}
      <Dialog
        open={showGSModal}
        onClose={() => setShowGSModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { ...dialogPaperSx, maxWidth: 480 } }}
      >
        <div className="rt-dialog-header">
          <span className="rt-dialog-title">
            <CellTowerIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
            {editingGsId !== null ? 'Edit Station' : 'Add Ground Station'}
          </span>
          <button className="rt-dialog-close" onClick={() => setShowGSModal(false)}>
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
              {editingGsId !== null && (
                <Button size="small" color="error" variant="outlined" onClick={() => { dispatch(deleteGroundStation(editingGsId)); setShowGSModal(false); }}>Delete</Button>
              )}
              <Button size="small" variant="contained" onClick={handleAddGS}>{editingGsId !== null ? 'Update' : 'Add'}</Button>
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
        <div className="rt-dialog-header">
          <span className="rt-dialog-title">
            <PublicIcon sx={{ fontSize: 18, color: '#8b5cf6' }} />
            Walker Constellation
          </span>
          <button className="rt-dialog-close" onClick={() => setShowConstellationModal(false)}>
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
        <div className="rt-dialog-header">
          <span className="rt-dialog-title">
            <LinkIcon sx={{ fontSize: 18, color: '#10b981' }} />
            Link Manager
          </span>
          <button className="rt-dialog-close" onClick={() => setShowLinkManager(false)}>
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

export default RightToolbar;
