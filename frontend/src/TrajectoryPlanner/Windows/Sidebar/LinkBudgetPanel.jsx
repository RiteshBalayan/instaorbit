import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import '../../../Styles/simulator/LinkBudget.css';
import { setActiveLinks, addLinkRecord, setLinks } from '../../../Store/communicationSlice';

const SCALE_TO_KM = 3185.5;
const SPEED_OF_LIGHT = 299792458;
const PLANCK = 6.62607015e-34;

const apertureGainDb = (diameterMeters, wavelengthNm) => {
  if (!diameterMeters || diameterMeters <= 0) return 0;
  const wavelength = wavelengthNm * 1e-9;
  const gainLinear = (Math.PI * diameterMeters) / wavelength;
  return 10 * Math.log10(gainLinear * gainLinear);
};

const fsplDb = (distanceMeters, wavelengthNm) => {
  if (!distanceMeters || distanceMeters <= 0) return 0;
  const wavelength = wavelengthNm * 1e-9;
  return 20 * Math.log10((4 * Math.PI * distanceMeters) / wavelength);
};

const formatNumber = (value, digits = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 1e4 || Math.abs(value) <= 1e-2) {
    return value.toExponential(2);
  }
  return value.toFixed(digits);
};

const defaultParams = {
  wavelengthNm: 1550,
  txPowerMw: 300,
  txAperture: 0.15,
  rxAperture: 0.5,
  pointingLoss: 2,
  atmosphericLoss: 1.5,
  marginDb: 2,
  noiseFloor: -95,
  requiredSnr: 10,
};

const LinkBudgetPanel = ({ presetLink = null }) => {
  const satellites = useSelector((state) => state.satellites.satellitesConfig);
  const currentStates = useSelector((state) => state.CurrentState.satelite);
  const groundStations = useSelector((state) => state.groundStations.groundStations);
  const linkHistory = useSelector((state) => state.communication.linkHistory);
  const savedLinks = useSelector((state) => state.communication.links);
  const renderTime = useSelector((state) => state.timer.RenderTime);
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
  const dispatch = useDispatch();
  const [linkConfigs, setLinkConfigs] = useState([]);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('selected');
  const [historyPage, setHistoryPage] = useState(0);
  const [itemsPerPage] = useState(20);
  const lastRecordTimeRef = useRef({});
  const initializedRef = useRef(false);

  // Reset page when filter changes
  useEffect(() => {
    setHistoryPage(0);
  }, [historyFilter]);

  const endpoints = useMemo(() => {
    const satEndpoints = satellites.map((sat) => ({
      id: `sat-${sat.id}`,
      label: sat.name || `Satellite ${sat.id}`,
      type: 'sat',
    }));
    const groundEndpoints = groundStations.map((gs) => ({
      id: gs.id,
      label: gs.name,
      type: 'ground',
    }));
    return [...satEndpoints, ...groundEndpoints];
  }, [groundStations, satellites]);

  // Load saved links only on initial mount
  useEffect(() => {
    // Skip if already initialized
    if (initializedRef.current) return;
    
    if (!endpoints.length) {
      setLinkConfigs([]);
      setSelectedLinkId(null);
      return;
    }
    
    // Only load preset link or saved links - don't auto-create
        if (presetLink && presetLink.txId && presetLink.rxId) {
          const id = presetLink.id || `link-${Date.now()}`;
      setLinkConfigs([{ ...presetLink, id, minElevationDeg: presetLink.minElevationDeg || 10 }]);
          setSelectedLinkId(id);
          setHistoryFilter(id);
      initializedRef.current = true;
      return;
        }
    
        if (savedLinks && savedLinks.length > 0) {
      setLinkConfigs(savedLinks);
          setSelectedLinkId(savedLinks[0].id);
          setHistoryFilter(savedLinks[0].id);
      initializedRef.current = true;
      return;
    }
    
    // If no preset or saved links, keep empty - user must click "Add Link"
    setLinkConfigs([]);
    initializedRef.current = true;
  }, [endpoints.length, presetLink, savedLinks]);

  const getPositionKm = (id) => {
    if (!id) return null;
    if (id.startsWith('sat-')) {
      const numericId = parseFloat(id.replace('sat-', ''));
      const satState = currentStates.find((s) => s.id === numericId);
      if (!satState?.coordinates) return null;
      return {
        x: satState.coordinates.x * SCALE_TO_KM,
        y: satState.coordinates.y * SCALE_TO_KM,
        z: satState.coordinates.z * SCALE_TO_KM,
      };
    }
    // Ground station - must account for reference frame rotation
    const gs = groundStations.find((g) => g.id === id);
    if (!gs) return null;
    const latRad = (gs.lat * Math.PI) / 180;
    const lonRad = (gs.lon * Math.PI) / 180;
    const r = 6378.137 + (gs.altKm || 0);
    
    let adjustedLon = lonRad;
    if (referenceSystem === 'EarthInertial') {
      // In EarthInertial frame, ground stations rotate with Earth
      const earthRotationRate = (2 * Math.PI) / (24 * 60 * 60); // rad/s
      adjustedLon = lonRad + (earthRotationRate * renderTime);
    }
    
    return {
      x: r * Math.cos(latRad) * Math.cos(adjustedLon),
      y: r * Math.cos(latRad) * Math.sin(adjustedLon),
      z: r * Math.sin(latRad),
    };
  };

  const getRenderPosition = (id) => {
    if (!id) return null;
    if (id.startsWith('sat-')) {
      const numericId = parseFloat(id.replace('sat-', ''));
      const satState = currentStates.find((s) => s.id === numericId);
      if (!satState?.coordinates) return null;
      const { x, y, z } = satState.coordinates;
      if (![x, y, z].every(Number.isFinite)) return null;
      return { x, y, z };
    }
    // Ground station - must account for reference frame
    const gs = groundStations.find((g) => g.id === id);
    if (!gs) return null;
    const latRad = (gs.lat * Math.PI) / 180;
    const lonRad = (gs.lon * Math.PI) / 180;
    const r = (6378.137 + (gs.altKm || 0)) / SCALE_TO_KM;
    
    let adjustedLon = lonRad;
    if (referenceSystem === 'EarthInertial') {
      // In EarthInertial frame, ground stations rotate with Earth
      const earthRotationRate = (2 * Math.PI) / (24 * 60 * 60);
      adjustedLon = lonRad + (earthRotationRate * renderTime);
    }
    
    const x = r * Math.cos(latRad) * Math.cos(adjustedLon);
    const y = r * Math.cos(latRad) * Math.sin(adjustedLon);
    const z = r * Math.sin(latRad);
    if (![x, y, z].every(Number.isFinite)) return null;
    return { x, y, z };
  };

  const computeLink = (cfg) => {
    const {
      txId,
      rxId,
      minElevationDeg,
      wavelengthNm = defaultParams.wavelengthNm,
      txPowerMw = defaultParams.txPowerMw,
      txAperture = defaultParams.txAperture,
      rxAperture = defaultParams.rxAperture,
      pointingLoss = defaultParams.pointingLoss,
      atmosphericLoss = defaultParams.atmosphericLoss,
      marginDb = defaultParams.marginDb,
      noiseFloor = defaultParams.noiseFloor,
      requiredSnr = defaultParams.requiredSnr,
    } = cfg;
    const txPos = getPositionKm(txId);
    const rxPos = getPositionKm(rxId);
    if (!txPos || !rxPos) return { ready: false, id: cfg.id, txId, rxId };

    const dx = txPos.x - rxPos.x;
    const dy = txPos.y - rxPos.y;
    const dz = txPos.z - rxPos.z;
    const rangeKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const rangeMeters = rangeKm * 1000;

    const fspl = fsplDb(rangeMeters, wavelengthNm);
    const txGain = apertureGainDb(txAperture, wavelengthNm);
    const rxGain = apertureGainDb(rxAperture, wavelengthNm);
    const channelLoss = fspl + pointingLoss + atmosphericLoss + marginDb - txGain - rxGain;

    // Check line-of-sight and elevation
    const txIsGround = !txId.startsWith('sat-');
    const rxIsGround = !rxId.startsWith('sat-');
    let elevationDeg = null;
    let inLink = true;
    
    // For ground-to-satellite links: check elevation angle
    if (txIsGround !== rxIsGround) {
      const groundId = txIsGround ? txId : rxId;
      const satPos = txIsGround ? rxPos : txPos;
      const groundPos = txIsGround ? txPos : rxPos;
      const gs = groundStations.find((g) => g.id === groundId);
      if (!gs || !satPos || !groundPos) return { ready: false, id: cfg.id, txId, rxId };
      const latRad = (gs.lat * Math.PI) / 180;
      let lonRad = (gs.lon * Math.PI) / 180;
      
      // Adjust longitude for ENU frame in EarthInertial mode
      if (referenceSystem === 'EarthInertial') {
        const earthRotationRate = (2 * Math.PI) / (24 * 60 * 60);
        lonRad = lonRad + (earthRotationRate * renderTime);
      }
      
      const dxg = satPos.x - groundPos.x;
      const dyg = satPos.y - groundPos.y;
      const dzg = satPos.z - groundPos.z;
      const sinLat = Math.sin(latRad);
      const cosLat = Math.cos(latRad);
      const sinLon = Math.sin(lonRad);
      const cosLon = Math.cos(lonRad);
      const east = -sinLon * dxg + cosLon * dyg;
      const north = -sinLat * cosLon * dxg - sinLat * sinLon * dyg + cosLat * dzg;
      const up = cosLat * cosLon * dxg + cosLat * sinLon * dyg + sinLat * dzg;
      const horiz = Math.sqrt(east * east + north * north);
      elevationDeg = Math.atan2(up, horiz) * (180 / Math.PI);
      inLink = elevationDeg >= minElevationDeg;
    }
    
    // For inter-satellite links: check if Earth blocks the line of sight
    if (!txIsGround && !rxIsGround) {
      const EARTH_RADIUS_KM = 6378.137;
      
      // Vector from tx to rx
      const vx = rxPos.x - txPos.x;
      const vy = rxPos.y - txPos.y;
      const vz = rxPos.z - txPos.z;
      
      // Vector from tx to origin (Earth center)
      const wx = -txPos.x;
      const wy = -txPos.y;
      const wz = -txPos.z;
      
      // Calculate closest point on line segment to origin
      const vDotV = vx * vx + vy * vy + vz * vz;
      const wDotV = wx * vx + wy * vy + wz * vz;
      const t = Math.max(0, Math.min(1, wDotV / vDotV)); // Clamp to [0, 1]
      
      // Closest point on line segment
      const closestX = txPos.x + t * vx;
      const closestY = txPos.y + t * vy;
      const closestZ = txPos.z + t * vz;
      
      // Distance from Earth center to closest point
      const distanceToEarth = Math.sqrt(closestX * closestX + closestY * closestY + closestZ * closestZ);
      
      // Link is blocked if line passes through Earth
      inLink = distanceToEarth >= EARTH_RADIUS_KM;
    }

    const txPowerDbm = 10 * Math.log10(Math.max(txPowerMw, 1e-9));
    const rxPowerDbm = txPowerDbm - channelLoss;
    const snrDb = rxPowerDbm - noiseFloor;
    const linkMargin = rxPowerDbm - (noiseFloor + requiredSnr);

    const photonEnergy = (PLANCK * SPEED_OF_LIGHT) / (wavelengthNm * 1e-9);
    const txPhotonRate = (txPowerMw / 1000) / photonEnergy;
    const channelTransmittance = 10 ** (-channelLoss / 10);
    const receivedPhotonRate = txPhotonRate * channelTransmittance;

    // Calculate data rate (assuming 1 bit per photon for PPM modulation)
    // For practical optical links: 1-2 bits per photon depending on modulation
    const bitsPerPhoton = 1; // Conservative estimate for PPM
    const dataRateBps = receivedPhotonRate * bitsPerPhoton;
    const dataRateMbps = dataRateBps / 1e6; // Convert to Mbps

    return {
      ready: true,
      id: cfg.id,
      txId,
      rxId,
      rangeKm,
      fspl,
      txGain,
      rxGain,
      channelLoss,
      rxPowerDbm,
      snrDb,
      linkMargin,
      receivedPhotonRate,
      dataRateMbps,
      elevationDeg,
      inLink,
      minElevationDeg,
      wavelengthNm,
      txPowerMw,
      txAperture,
      rxAperture,
      pointingLoss,
      atmosphericLoss,
      marginDb,
      noiseFloor,
      requiredSnr,
    };
  };

  // Create a dependency key that changes when any satellite position changes
  const satPositionKey = useMemo(() => {
    return currentStates.map(s => 
      `${s.id}-${s.coordinates?.x}-${s.coordinates?.y}-${s.coordinates?.z}-${s.lastUpdate || ''}`
    ).join('|');
  }, [currentStates]);

  const linkResults = useMemo(() => {
    console.log('LinkBudget: Recomputing link results', { 
      numConfigs: linkConfigs.length, 
      renderTime,
      satPositionKey 
    });
    return linkConfigs.map((cfg) => computeLink(cfg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    linkConfigs,
    groundStations,
    renderTime,
    satPositionKey,
  ]);

  useEffect(() => {
    const active = [];
    const timestamp = Date.now();
    const RECORD_THROTTLE_MS = 1000; // Record to history every 1 second

    linkResults.forEach((result) => {
      if (!result.ready || !result.inLink) return;
      const txRender = getRenderPosition(result.txId);
      const rxRender = getRenderPosition(result.rxId);
      if (
        !txRender ||
        !rxRender ||
        ![txRender.x, txRender.y, txRender.z, rxRender.x, rxRender.y, rxRender.z].every(Number.isFinite)
      ) {
        return;
      }
      
      active.push({
        id: `${result.txId}-${result.rxId}`,
        from: txRender,
        to: rxRender,
        txId: result.txId,
        rxId: result.rxId,
        metrics: {
          rangeKm: result.rangeKm,
          channelLoss: result.channelLoss,
          rxPowerDbm: result.rxPowerDbm,
          snrDb: result.snrDb,
          linkMargin: result.linkMargin,
          receivedPhotonRate: result.receivedPhotonRate,
          dataRateMbps: result.dataRateMbps,
          elevationDeg: result.elevationDeg,
          txPowerMw: result.txPowerMw,
          wavelengthNm: result.wavelengthNm,
          txGain: result.txGain,
          rxGain: result.rxGain,
          fspl: result.fspl,
          timestamp,
        },
      });

      // Throttle link history recording to avoid excessive records
      const linkKey = `${result.txId}-${result.rxId}`;
      const lastRecordTime = lastRecordTimeRef.current[linkKey] || 0;
      
      if (timestamp - lastRecordTime >= RECORD_THROTTLE_MS) {
        lastRecordTimeRef.current[linkKey] = timestamp;
        dispatch(
          addLinkRecord({
            id: `${linkKey}-${timestamp}`,
            timestamp,
            txId: result.txId,
            rxId: result.rxId,
            metrics: {
              rangeKm: result.rangeKm,
              channelLoss: result.channelLoss,
              rxPowerDbm: result.rxPowerDbm,
              snrDb: result.snrDb,
              linkMargin: result.linkMargin,
              receivedPhotonRate: result.receivedPhotonRate,
              dataRateMbps: result.dataRateMbps,
              elevationDeg: result.elevationDeg,
              txPowerMw: result.txPowerMw,
              wavelengthNm: result.wavelengthNm,
              txGain: result.txGain,
              rxGain: result.rxGain,
              fspl: result.fspl,
            },
          })
        );
      }
    });
    dispatch(setActiveLinks(active));
  }, [dispatch, linkResults]);

  const renderSelect = (label, value, onChange) => (
    <Box className="link-field">
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
        {label}
      </Typography>
      <Select 
        size="small" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        fullWidth
        sx={{
          color: '#fff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.2)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.3)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#4299e1',
          },
          '& .MuiSvgIcon-root': {
            color: 'rgba(255,255,255,0.7)',
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: 'rgba(45, 55, 72, 0.98)',
              backdropFilter: 'blur(10px)',
              '& .MuiMenuItem-root': {
                color: '#fff',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(66, 153, 225, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(66, 153, 225, 0.4)',
                  },
                },
              },
            },
          },
        }}
      >
        {endpoints.map((ep) => (
          <MenuItem key={ep.id} value={ep.id}>
            {ep.label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  const updateLinkParam = (linkId, paramName, value) => {
    const newConfigs = linkConfigs.map((l) => 
      l.id === linkId ? { ...l, [paramName]: value } : l
    );
    setLinkConfigs(newConfigs);
    dispatch(setLinks(newConfigs));
  };

  const renderInput = (label, value, setter, props = {}) => (
    <Box className="link-field">
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
        {label}
      </Typography>
      <TextField
        size="small"
        type="number"
        value={value ?? ''}
        onChange={(e) => setter(Number(e.target.value))}
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            color: '#fff',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4299e1',
            },
          },
        }}
        {...props}
      />
    </Box>
  );

  const getLabel = (id) => endpoints.find((e) => e.id === id)?.label || id;

  return (
    <Box className="link-budget-panel" sx={{ backgroundColor: 'rgba(45, 55, 72, 0.95)', borderRadius: 1, p: 2 }}>
      <Box className="link-budget-header">
        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>Optical Link Budget</Typography>
      </Box>

      {!endpoints.length && (
        <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: 'rgba(255,255,255,0.7)' }}>
          Add a satellite and ground station to create links.
        </Typography>
      )}

      {!!endpoints.length && (
        <>
            <Box className="links-section">
            <Box className="links-header">
              <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>Communication Links ({linkConfigs.length})</Typography>
              {!presetLink && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    if (!endpoints.length) return;
                    if (endpoints.length < 2) {
                      alert('You need at least 2 endpoints (satellite and ground station) to create a link!');
                      return;
                    }
                    const tx = endpoints[0].id;
                    const rx = endpoints[1]?.id || endpoints[0].id;
                    
                    // Check if this link already exists
                    const linkExists = linkConfigs.some(link => 
                      (link.txId === tx && link.rxId === rx) || (link.txId === rx && link.rxId === tx)
                    );
                    
                    if (linkExists) {
                      alert('A link between these endpoints already exists!');
                      return;
                    }
                    
                    const id = `link-${Date.now()}`;
                    const newLink = { id, txId: tx, rxId: rx, minElevationDeg: 10, ...defaultParams };
                    setLinkConfigs((prev) => [...prev, newLink]);
                    setSelectedLinkId(id);
                    setHistoryFilter(id);
                    // Save to Redux
                    dispatch(setLinks([...linkConfigs, newLink]));
                  }}
                >
                  Add Link
                </Button>
              )}
            </Box>
            <Box className="actions-bar">
              <Button size="small" variant="outlined" onClick={() => setShowHistory(true)}>
                View History
              </Button>
            </Box>
            <Box className="links-list">
              {linkConfigs.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4, px: 2, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 2, border: '2px dashed rgba(255,255,255,0.2)' }}>
                  <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.9)' }}>
                    No links configured yet.
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Click "Add Link" above to create a communication link between endpoints.
                  </Typography>
                </Box>
              )}
              {linkConfigs.map((cfg, index) => {
                const result = linkResults.find((r) => r.id === cfg.id) || { ready: false };
                const status = !result.ready ? 'Waiting for positions' : result.inLink ? 'In communication' : 'Not in communication';
                return (
                  <Box 
                    key={cfg.id} 
                    className="link-card"
                    sx={{
                      backgroundColor: selectedLinkId === cfg.id ? 'rgba(66, 153, 225, 0.2)' : 'rgba(0,0,0,0.3)',
                      border: selectedLinkId === cfg.id ? '2px solid #4299e1' : '1px solid rgba(255,255,255,0.2)',
                      mb: 2,
                      boxShadow: selectedLinkId === cfg.id ? '0 2px 8px rgba(66, 153, 225, 0.3)' : 'none',
                      borderRadius: 1
                    }}
                  >
                    <Box className="link-card-header" sx={{ 
                      backgroundColor: selectedLinkId === cfg.id ? 'rgba(66, 153, 225, 0.25)' : 'rgba(0,0,0,0.3)',
                      borderBottom: '2px solid rgba(255,255,255,0.1)',
                      p: 1.5,
                      mb: 1.5
                    }}>
                      <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        variant="subtitle2"
                        onClick={() => {
                          setSelectedLinkId(cfg.id);
                          setHistoryFilter(cfg.id);
                        }}
                          style={{ 
                            cursor: 'pointer', 
                            fontWeight: 600,
                            color: selectedLinkId === cfg.id ? '#60a5fa' : '#fff'
                          }}
                        >
                          Link #{index + 1}: {getLabel(cfg.txId)} → {getLabel(cfg.rxId)}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          if (window.confirm(`Delete link between ${getLabel(cfg.txId)} and ${getLabel(cfg.rxId)}?`)) {
                            const newConfigs = linkConfigs.filter((l) => l.id !== cfg.id);
                            setLinkConfigs(newConfigs);
                            // Save to Redux
                            dispatch(setLinks(newConfigs));
                          }
                        }}
                        sx={{ color: '#ef4444' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ px: 1.5, pb: 1.5 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'block', mb: 1 }}>
                        Link Endpoints
                      </Typography>
                      <Box className="link-card-grid" sx={{ mb: 2 }}>
                        {renderSelect('Transmitter', cfg.txId, (val) => {
                          // Check if new configuration would create duplicate
                          const wouldBeDuplicate = linkConfigs.some(link => 
                            link.id !== cfg.id && ((link.txId === val && link.rxId === cfg.rxId) || (link.txId === cfg.rxId && link.rxId === val))
                          );
                          if (wouldBeDuplicate) {
                            alert('This link configuration already exists!');
                            return;
                          }
                          const newConfigs = linkConfigs.map((l) => l.id === cfg.id ? { ...l, txId: val } : l);
                          setLinkConfigs(newConfigs);
                          dispatch(setLinks(newConfigs));
                        })}
                        {renderSelect('Receiver', cfg.rxId, (val) => {
                          // Check if new configuration would create duplicate
                          const wouldBeDuplicate = linkConfigs.some(link => 
                            link.id !== cfg.id && ((link.txId === cfg.txId && link.rxId === val) || (link.txId === val && link.rxId === cfg.txId))
                          );
                          if (wouldBeDuplicate) {
                            alert('This link configuration already exists!');
                            return;
                          }
                          const newConfigs = linkConfigs.map((l) => l.id === cfg.id ? { ...l, rxId: val } : l);
                          setLinkConfigs(newConfigs);
                          dispatch(setLinks(newConfigs));
                        })}
                      </Box>
                      
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'block', mb: 1 }}>
                        Link Parameters
                      </Typography>
                      <Box className="link-card-grid" sx={{ mb: 2 }}>
                      {renderInput('Min Elevation (deg)', cfg.minElevationDeg, (val) => updateLinkParam(cfg.id, 'minElevationDeg', val), {
                        inputProps: { step: 1, min: 0, max: 90 },
                      })}
                      {renderInput('Wavelength (nm)', cfg.wavelengthNm ?? defaultParams.wavelengthNm, (val) => updateLinkParam(cfg.id, 'wavelengthNm', val))}
                      {renderInput('Tx Power (mW)', cfg.txPowerMw ?? defaultParams.txPowerMw, (val) => updateLinkParam(cfg.id, 'txPowerMw', val))}
                      {renderInput('Tx Aperture (m)', cfg.txAperture ?? defaultParams.txAperture, (val) => updateLinkParam(cfg.id, 'txAperture', val), { inputProps: { step: 0.01 } })}
                      {renderInput('Rx Aperture (m)', cfg.rxAperture ?? defaultParams.rxAperture, (val) => updateLinkParam(cfg.id, 'rxAperture', val), { inputProps: { step: 0.01 } })}
                      {renderInput('Pointing Loss (dB)', cfg.pointingLoss ?? defaultParams.pointingLoss, (val) => updateLinkParam(cfg.id, 'pointingLoss', val), { inputProps: { step: 0.5 } })}
                      {renderInput('Atmospheric Loss (dB)', cfg.atmosphericLoss ?? defaultParams.atmosphericLoss, (val) => updateLinkParam(cfg.id, 'atmosphericLoss', val), { inputProps: { step: 0.5 } })}
                      {renderInput('Margin (dB)', cfg.marginDb ?? defaultParams.marginDb, (val) => updateLinkParam(cfg.id, 'marginDb', val), { inputProps: { step: 0.5 } })}
                      {renderInput('Receiver Noise (dBm)', cfg.noiseFloor ?? defaultParams.noiseFloor, (val) => updateLinkParam(cfg.id, 'noiseFloor', val), { inputProps: { step: 1 } })}
                      {renderInput('Required SNR (dB)', cfg.requiredSnr ?? defaultParams.requiredSnr, (val) => updateLinkParam(cfg.id, 'requiredSnr', val), { inputProps: { step: 0.5 } })}
                    </Box>
                      
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'block', mb: 1 }}>
                        Link Status & Metrics
                      </Typography>
                      <Box className="link-card-metrics" sx={{ 
                        backgroundColor: 'rgba(0,0,0,0.3)', 
                        p: 1.5, 
                        borderRadius: 1,
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600, 
                          mb: 1,
                          color: result.inLink ? '#4ade80' : 'rgba(255,255,255,0.6)'
                        }}>
                          Status: {status}
                        </Typography>
                      {result.ready && (
                        <Box className="link-metrics-grid" sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(2, 1fr)', 
                          gap: 1,
                          '& > div': {
                            display: 'flex',
                            justifyContent: 'space-between',
                            '& .metric-label': {
                              color: 'rgba(255,255,255,0.6)',
                              fontSize: '0.75rem'
                            },
                            '& > span:last-child': {
                              color: 'rgba(255,255,255,0.95)',
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }
                          }
                        }}>
                          <div><span className="metric-label">Range</span><span>{formatNumber(result.rangeKm, 2)} km</span></div>
                          <div><span className="metric-label">Elevation</span><span>{result.elevationDeg !== null ? `${formatNumber(result.elevationDeg, 1)}° (min ${cfg.minElevationDeg}°)` : '—'}</span></div>
                          <div><span className="metric-label">Rx Power</span><span>{result.inLink ? `${formatNumber(result.rxPowerDbm, 2)} dBm` : '—'}</span></div>
                          <div><span className="metric-label">SNR/Margin</span><span>{result.inLink ? `${formatNumber(result.snrDb, 1)} dB / ${formatNumber(result.linkMargin, 1)} dB` : '—'}</span></div>
                          <div><span className="metric-label">Channel Loss</span><span>{formatNumber(result.channelLoss, 2)} dB</span></div>
                          <div><span className="metric-label">Photon Rate</span><span>{result.inLink ? `${formatNumber(result.receivedPhotonRate, 2)} cps` : '—'}</span></div>
                        </Box>
                      )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Divider className="link-divider" />

          <Dialog 
            open={showHistory && linkHistory.length > 0} 
            onClose={() => setShowHistory(false)} 
            fullWidth 
            maxWidth="md"
            PaperProps={{
              sx: {
                backgroundColor: 'rgba(45, 55, 72, 0.98)',
                backdropFilter: 'blur(10px)',
                color: '#fff'
              }
            }}
          >
            <DialogTitle sx={{ color: '#fff' }}>Link History</DialogTitle>
            <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <Box className="history-header" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>Filter</Typography>
                <Select
                  size="small"
                  value={historyFilter || 'all'}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#4299e1',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'rgba(255,255,255,0.7)',
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: 'rgba(45, 55, 72, 0.98)',
                        backdropFilter: 'blur(10px)',
                        '& .MuiMenuItem-root': {
                          color: '#fff',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.1)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(66, 153, 225, 0.3)',
                            '&:hover': {
                              backgroundColor: 'rgba(66, 153, 225, 0.4)',
                            },
                          },
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="all">All links</MenuItem>
                  {linkConfigs.map((cfg) => (
                    <MenuItem key={cfg.id} value={cfg.id}>
                      {getLabel(cfg.txId)} → {getLabel(cfg.rxId)}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
              <Box sx={{ overflowX: 'auto', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 1, p: 1, maxHeight: '400px', overflowY: 'auto' }}>
                <table className="history-table-modal" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.3)' }}>
                      <th style={{ color: 'rgba(255,255,255,0.95)', padding: '10px 8px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Time</th>
                      <th style={{ color: 'rgba(255,255,255,0.95)', padding: '10px 8px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Transmitter</th>
                      <th style={{ color: 'rgba(255,255,255,0.95)', padding: '10px 8px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Receiver</th>
                      <th style={{ color: 'rgba(255,255,255,0.95)', padding: '10px 8px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Elevation</th>
                      <th style={{ color: 'rgba(255,255,255,0.95)', padding: '10px 8px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Rx Power</th>
                      <th style={{ color: '#4ade80', padding: '10px 8px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Channel Loss</th>
                      <th style={{ color: '#60a5fa', padding: '10px 8px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Photon Rate</th>
                    </tr>
                  </thead>
                <tbody>
                    {(() => {
                      const filtered = linkHistory
                    .filter((rec) => {
                          if (historyFilter === 'all') return true;
                          if (!historyFilter) return true;
                          const cfg = linkConfigs.find((c) => c.id === historyFilter);
                          if (!cfg) return true;
                          return rec.txId === cfg.txId && rec.rxId === cfg.rxId;
                        })
                        .reverse();
                      
                      const startIndex = historyPage * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedData = filtered.slice(startIndex, endIndex);
                      
                      return paginatedData.map((rec) => {
                        // Check if these fields exist to differentiate between 0 and missing data
                        const hasChannelLoss = rec.metrics?.channelLoss !== undefined && rec.metrics?.channelLoss !== null;
                        const hasPhotonRate = rec.metrics?.receivedPhotonRate !== undefined && rec.metrics?.receivedPhotonRate !== null;
                        
                        return (
                          <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <td style={{ color: 'rgba(255,255,255,0.9)', padding: '8px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{new Date(rec.timestamp).toLocaleTimeString()}</td>
                            <td style={{ color: 'rgba(255,255,255,0.9)', padding: '8px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{getLabel(rec.txId)}</td>
                            <td style={{ color: 'rgba(255,255,255,0.9)', padding: '8px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{getLabel(rec.rxId)}</td>
                            <td style={{ color: 'rgba(255,255,255,0.9)', padding: '8px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatNumber(rec.metrics?.elevationDeg, 1)}°</td>
                            <td style={{ color: 'rgba(255,255,255,0.9)', padding: '8px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatNumber(rec.metrics?.rxPowerDbm, 2)} dBm</td>
                            <td style={{ color: 'rgba(255,255,255,0.9)', padding: '8px', fontSize: '0.875rem', whiteSpace: 'nowrap', fontWeight: hasChannelLoss ? 'normal' : '300' }}>
                              {hasChannelLoss ? `${formatNumber(rec.metrics.channelLoss, 2)} dB` : '—'}
                            </td>
                            <td style={{ color: 'rgba(255,255,255,0.9)', padding: '8px', fontSize: '0.875rem', whiteSpace: 'nowrap', fontWeight: hasPhotonRate ? 'normal' : '300' }}>
                              {hasPhotonRate ? `${formatNumber(rec.metrics.receivedPhotonRate, 2)} cps` : '—'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 1 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {(() => {
                    const filtered = linkHistory.filter((rec) => {
                      if (historyFilter === 'all') return true;
                      if (!historyFilter) return true;
                      const cfg = linkConfigs.find((c) => c.id === historyFilter);
                      if (!cfg) return true;
                      return rec.txId === cfg.txId && rec.rxId === cfg.rxId;
                    });
                    const totalPages = Math.ceil(filtered.length / itemsPerPage);
                    return `Page ${historyPage + 1} of ${Math.max(1, totalPages)} (${filtered.length} total records)`;
                  })()}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    disabled={historyPage === 0}
                    onClick={() => setHistoryPage(prev => Math.max(0, prev - 1))}
                    sx={{ 
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.3)',
                      '&:hover': {
                        borderColor: 'rgba(255,255,255,0.5)',
                        backgroundColor: 'rgba(255,255,255,0.1)'
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255,255,255,0.3)',
                        borderColor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Previous
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    disabled={(() => {
                      const filtered = linkHistory.filter((rec) => {
                        if (historyFilter === 'all') return true;
                        if (!historyFilter) return true;
                        const cfg = linkConfigs.find((c) => c.id === historyFilter);
                        if (!cfg) return true;
                        return rec.txId === cfg.txId && rec.rxId === cfg.rxId;
                      });
                      const totalPages = Math.ceil(filtered.length / itemsPerPage);
                      return historyPage >= totalPages - 1;
                    })()}
                    onClick={() => setHistoryPage(prev => prev + 1)}
                    sx={{ 
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.3)',
                      '&:hover': {
                        borderColor: 'rgba(255,255,255,0.5)',
                        backgroundColor: 'rgba(255,255,255,0.1)'
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255,255,255,0.3)',
                        borderColor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <Button onClick={() => setShowHistory(false)} sx={{ color: '#fff' }}>Close</Button>
            </DialogActions>
          </Dialog>

        </>
      )}
    </Box>
  );
};

export default LinkBudgetPanel;
