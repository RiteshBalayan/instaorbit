import React, { useState } from 'react';
import { IconButton, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Divider } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import AddSatellite from './AddSatellite';
import AddConstellation from './AddConstellation';
import SatelliteList from './SatelliteList';
import UTControl from './UtilityControlMain';
import '../../../Styles/simulator/UtilityPanel.css';
import LinkManager from './LinkManager';
import { useDispatch, useSelector } from 'react-redux';
import { addGroundStation, updateGroundStation, deleteGroundStation } from '../../../Store/groundStationSlice';
import { deleteSatellite } from '../../../Store/satelliteSlice';
import { deleteParticle } from '../../../Store/StateTimeSeries';
import { deleteState } from '../../../Store/CurrentState';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const UtilityPanel = () => {
  const [topHeight, setTopHeight] = useState(70);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showGSModal, setShowGSModal] = useState(false);
  const [gsName, setGsName] = useState('New Ground Station');
  const [gsLat, setGsLat] = useState(0);
  const [gsLon, setGsLon] = useState(0);
  const [gsAlt, setGsAlt] = useState(0.1);
  const [showLinkManager, setShowLinkManager] = useState(false);
  const [showSatModal, setShowSatModal] = useState(false);
  const [showConstellationModal, setShowConstellationModal] = useState(false);
  const [editingSatId, setEditingSatId] = useState(null);
  const [editingGsId, setEditingGsId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const groundStations = useSelector((state) => state.groundStations.groundStations);
  const satellites = useSelector((state) => state.satellites.satellitesConfig);
  const dispatch = useDispatch();
  const activeLinks = useSelector((state) => state.communication.activeLinks);
  const savedLinks = useSelector((state) => state.communication.links);

  const handleDrag = (e) => {
    const newTopHeight = (e.clientY / window.innerHeight) * 100;
    if (newTopHeight > 10 && newTopHeight < 90) {
      setTopHeight(newTopHeight);
    }
  };

  const togglePanel = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleAddGS = () => {
    if (editingGsId !== null) {
      dispatch(updateGroundStation({
        id: editingGsId,
        changes: {
          name: gsName || 'Ground Station',
          lat: Number(gsLat) || 0,
          lon: Number(gsLon) || 0,
          altKm: Number(gsAlt) || 0,
        }
      }));
    } else {
      dispatch(addGroundStation({
        id: `gs-${Date.now()}`,
        name: gsName || 'Ground Station',
        lat: Number(gsLat) || 0,
        lon: Number(gsLon) || 0,
        altKm: Number(gsAlt) || 0,
      }));
    }
    setShowGSModal(false);
  };

  const handleUpdateGS = (id, field, value) => {
    const numericFields = ['lat', 'lon', 'altKm'];
    const parsed = numericFields.includes(field) ? Number(value) : value;
    dispatch(updateGroundStation({ id, changes: { [field]: parsed } }));
  };

  const handleDeleteGS = (id) => {
    dispatch(deleteGroundStation(id));
  };

  const openGsModal = (id = null) => {
    if (id !== null) {
      const gs = groundStations.find((g) => g.id === id);
      if (gs) {
        setGsName(gs.name);
        setGsLat(gs.lat);
        setGsLon(gs.lon);
        setGsAlt(gs.altKm);
        setMapCenter([gs.lat, gs.lon]);
      }
    } else {
      setGsName('New Ground Station');
      setGsLat(0);
      setGsLon(0);
      setGsAlt(0.1);
    }
    setEditingGsId(id);
    setShowGSModal(true);
  };

  const MapClickSelector = ({ onSelect }) => {
    useMapEvents({
      click: (e) => {
        onSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  // Helper function to convert endpoint ID to name
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

  return (
    <div>
      {isCollapsed ? (
        <Box className="toggle-container">
          <IconButton className="toggle-button" onClick={togglePanel}>
            <ChevronLeft />
          </IconButton>
          <div className="toggle-text">Utility Panel</div>
        </Box>
      ) : (
        <div className="resizable-panels" style={{ width: expanded ? '26vw' : '20vw' }}>
          <IconButton className="collapse-button" onClick={togglePanel}>
            <ChevronRight />
          </IconButton>
          <div className="top-panel assets-panel" style={{ height: `${topHeight}%` }}>
            <Box className="panel-header minimal">
              <Typography variant="subtitle1">Assets</Typography>
              <div className="panel-actions">
                <Button size="small" variant="text" onClick={() => setExpanded((p) => !p)}>
                  {expanded ? 'Compact' : 'Expand'}
                </Button>
              </div>
            </Box>
              <Box className="asset-block">
                <Box className="asset-block-header">
                  <Typography variant="subtitle2">Satellites</Typography>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setEditingSatId(null);
                        setShowSatModal(true);
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowConstellationModal(true)}
                      sx={{ fontSize: 11, textTransform: 'none', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                    >
                      Walker
                    </Button>
                  </div>
                </Box>
                <Box className="asset-list">
                  {satellites.length === 0 && <Typography variant="body2">None added yet</Typography>}
                  {satellites.map((sat) => (
                    <Box key={sat.id} className="asset-row">
                      <Typography variant="body2">{sat.name || `Satellite ${sat.id}`}</Typography>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingSatId(sat.id);
                          setShowSatModal(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          dispatch(deleteSatellite(sat.id));
                          dispatch(deleteParticle(sat.id));
                          dispatch(deleteState(sat.id));
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box className="asset-block">
                <Box className="asset-block-header">
                  <Typography variant="subtitle2">Ground Stations</Typography>
                  <Button size="small" variant="contained" onClick={() => openGsModal(null)}>Add</Button>
                </Box>
                <Box className="asset-list">
                  {groundStations.length === 0 && <Typography variant="body2">None added yet</Typography>}
                {groundStations.map((gs) => (
                  <Box key={gs.id} className="asset-row">
                    <Typography variant="body2">{gs.name}</Typography>
                    <Button size="small" onClick={() => openGsModal(gs.id)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => handleDeleteGS(gs.id)}>Delete</Button>
                  </Box>
                ))}
              </Box>
            </Box>
              <Box className="asset-block">
                <Box className="asset-block-header">
                  <Typography variant="subtitle2">Links</Typography>
                  <Button size="small" variant="contained" onClick={() => setShowLinkManager(true)}>Manage</Button>
                </Box>
                <Box className="asset-list">
                  {savedLinks.length === 0 && <Typography variant="body2">No links configured</Typography>}
                  {savedLinks.map((link) => (
                    <Box key={link.id} className="asset-row">
                      <Typography variant="body2">{getEndpointName(link.txId)} → {getEndpointName(link.rxId)}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
          </div>
          <div
            className="drag-line"
            onMouseDown={(e) => {
              e.preventDefault();
              window.addEventListener('mousemove', handleDrag);
              window.addEventListener('mouseup', () => {
                window.removeEventListener('mousemove', handleDrag);
              }, { once: true });
            }}
          />
          <div className="bottom-panel" style={{ height: `${100 - topHeight}%` }}>
            <UTControl />
          </div>
        </div>
      )}

      <Dialog 
        open={showSatModal} 
        onClose={() => setShowSatModal(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(45, 55, 72, 0.98)',
            backdropFilter: 'blur(10px)',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Add Satellites</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Box className="modal-card">
            <AddSatellite editId={editingSatId} onClose={() => setShowSatModal(false)} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setShowSatModal(false)} sx={{ color: '#fff' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={showGSModal} 
        onClose={() => setShowGSModal(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(45, 55, 72, 0.98)',
            backdropFilter: 'blur(10px)',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Ground Stations</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Box className="modal-card" display="flex" flexDirection="column" gap={2}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>Click map or enter coordinates to add stations.</Typography>
            <Box className="gs-modal-map">
              <MapContainer center={mapCenter} zoom={2} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickSelector
                  onSelect={(lat, lon) => {
                    setGsLat(lat.toFixed(4));
                    setGsLon(lon.toFixed(4));
                    setMapCenter([lat, lon]);
                  }}
                />
                {groundStations.map((gs) => (
                  <CircleMarker key={gs.id} center={[gs.lat, gs.lon]} radius={6} pathOptions={{ color: '#7dd3fc', fillColor: '#38bdf8', fillOpacity: 0.8 }} />
                ))}
                <CircleMarker center={[parseFloat(gsLat) || 0, parseFloat(gsLon) || 0]} radius={7} pathOptions={{ color: '#f97316', fillColor: '#fb923c', fillOpacity: 0.8 }} />
              </MapContainer>
            </Box>
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap={1}>
              <TextField 
                label="Name" 
                value={gsName} 
                onChange={(e) => setGsName(e.target.value)} 
                fullWidth
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#4299e1' },
                  },
                }}
              />
              <TextField 
                label="Latitude (deg)" 
                type="number" 
                value={gsLat} 
                onChange={(e) => setGsLat(e.target.value)} 
                fullWidth
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#4299e1' },
                  },
                }}
              />
              <TextField 
                label="Longitude (deg)" 
                type="number" 
                value={gsLon} 
                onChange={(e) => setGsLon(e.target.value)} 
                fullWidth
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#4299e1' },
                  },
                }}
              />
              <TextField 
                label="Altitude (km)" 
                type="number" 
                value={gsAlt} 
                onChange={(e) => setGsAlt(e.target.value)} 
                fullWidth
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&.Mui-focused fieldset': { borderColor: '#4299e1' },
                  },
                }}
              />
            </Box>
            <Button variant="contained" onClick={handleAddGS}>Add Ground Station</Button>
            {editingGsId !== null && (
              <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteGS(editingGsId)}>
                Delete Ground Station
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setShowGSModal(false)} sx={{ color: '#fff' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showConstellationModal}
        onClose={() => setShowConstellationModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(45, 55, 72, 0.98)',
            backdropFilter: 'blur(10px)',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Walker Constellation</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Box className="modal-card">
            <AddConstellation onClose={() => setShowConstellationModal(false)} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setShowConstellationModal(false)} sx={{ color: '#fff' }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={showLinkManager} 
        onClose={() => setShowLinkManager(false)} 
        fullWidth 
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(30, 41, 59, 0.98)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            maxHeight: '80vh',
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', pb: 0.5 }}>Link Manager</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)', p: 2 }}>
          <LinkManager />
        </DialogContent>
        <DialogActions sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setShowLinkManager(false)} sx={{ color: '#fff' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default UtilityPanel;
