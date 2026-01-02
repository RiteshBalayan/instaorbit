import React, { useMemo, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Popover, Checkbox, FormControlLabel } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { setActiveLinks, addLinkRecord } from '../../../Store/communicationSlice';

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
  minElevationDeg: 10,
};

const LinkBudgetBoard = () => {
  const dispatch = useDispatch();
  const links = useSelector((state) => state.communication.links);
  const linkHistory = useSelector((state) => state.communication.linkHistory);
  const satellites = useSelector((state) => state.satellites.satellitesConfig);
  const groundStations = useSelector((state) => state.groundStations.groundStations);
  const currentStates = useSelector((state) => state.CurrentState.satelite);
  const particles = useSelector((state) => state.particles?.particles || []);
  const renderTime = useSelector((state) => state.timer.RenderTime);
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
  const [openHistory, setOpenHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [localLinks, setLocalLinks] = useState([]);
  const [selectedLinkIds, setSelectedLinkIds] = useState([]); // Track which links to display
  const [filterAnchorEl, setFilterAnchorEl] = useState(null); // Popover anchor

  const nameFor = (id) => {
    if (!id) return 'Unknown';
    if (id.startsWith('sat-')) {
      const sat = satellites.find((s) => `sat-${s.id}` === id);
      return sat?.name || id;
    }
    const gs = groundStations.find((g) => g.id === id);
    return gs?.name || id;
  };

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
  }, [satellites, groundStations]);

  useEffect(() => {
    if (links?.length) {
      setLocalLinks(links);
      // Initialize selected links with first 3 if not set
      if (selectedLinkIds.length === 0 && links.length > 0) {
        setSelectedLinkIds(links.slice(0, 3).map(l => l.id));
      }
    } else {
      // Don't auto-create links - wait for user to explicitly create them
      setLocalLinks([]);
      setSelectedLinkIds([]);
    }
  }, [links]);
  
  // Handle link selection
  const handleLinkToggle = (linkId) => {
    setSelectedLinkIds(prev => {
      if (prev.includes(linkId)) {
        // Remove if already selected
        return prev.filter(id => id !== linkId);
      } else {
        // Add if under limit of 3
        if (prev.length < 3) {
          return [...prev, linkId];
        }
        // If at limit, don't add (user must deselect one first)
        return prev;
      }
    });
  };
  
  // Handle filter popover
  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };
  
  const openFilter = Boolean(filterAnchorEl);
  
  // Get filtered links based on selection
  const displayedLinks = useMemo(() => {
    return localLinks.filter(link => selectedLinkIds.includes(link.id));
  }, [localLinks, selectedLinkIds]);

  const getPositionKm = (id) => {
    if (!id) return null;
    if (id.startsWith('sat-')) {
      const numericId = parseFloat(id.replace('sat-', ''));
      const satState = currentStates.find((s) => s.id === numericId);
      const particle = particles.find((p) => p.id === numericId);
      const coords = satState?.coordinates || particle?.tracePoints?.slice(-1)[0];
      if (!coords) return null;
      return {
        x: coords.x * SCALE_TO_KM,
        y: coords.y * SCALE_TO_KM,
        z: coords.z * SCALE_TO_KM,
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

  const computeLink = (cfg) => {
    const {
      txId,
      rxId,
      minElevationDeg = defaultParams.minElevationDeg,
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
    if (!txPos || !rxPos) return null;

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
      if (!gs) return null;
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

    return {
      id: cfg.id,
      txId,
      rxId,
      rangeKm,
      rxPowerDbm,
      snrDb,
      linkMargin,
      elevationDeg,
      inLink,
      ready: true,
    };
  };

  // Create a dependency key that changes when any satellite position changes
  const satPositionKey = useMemo(() => {
    return currentStates.map(s => 
      `${s.id}-${s.coordinates?.x}-${s.coordinates?.y}-${s.coordinates?.z}-${s.lastUpdate || ''}`
    ).join('|');
  }, [currentStates]);

  const linkResults = useMemo(() => {
    console.log('LinkBudgetBoard: Recomputing link results', {
      numLinks: localLinks.length,
      renderTime,
      satPositionKey
    });
    return localLinks.map((l) => computeLink(l)).filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localLinks, groundStations, renderTime, satPositionKey]);

  useEffect(() => {
    // Update active links for rendering lines (only valid positions)
    
    // Helper to get ground station position in scene units (matching GroundStationRender.jsx)
    const getGroundStationRenderPosition = (gs) => {
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
      
      return {
        x: r * Math.cos(latRad) * Math.cos(adjustedLon),
        y: r * Math.cos(latRad) * Math.sin(adjustedLon),
        z: r * Math.sin(latRad),
      };
    };
    
    const active = linkResults
      .filter((r) => r.inLink)
      .map((r) => {
        const txState = currentStates.find((s) => `sat-${s.id}` === r.txId);
        const rxState = currentStates.find((s) => `sat-${s.id}` === r.rxId);
        const gsTx = groundStations.find((g) => g.id === r.txId);
        const gsRx = groundStations.find((g) => g.id === r.rxId);
        
        // Get render positions (already in scene units)
        const txRender = txState?.coordinates || (gsTx ? getGroundStationRenderPosition(gsTx) : null);
        const rxRender = rxState?.coordinates || (gsRx ? getGroundStationRenderPosition(gsRx) : null);
        
        if (!txRender || !rxRender) return null;
        const { x: fx, y: fy, z: fz } = txRender;
        const { x: tx, y: ty, z: tz } = rxRender;
        if (![fx, fy, fz, tx, ty, tz].every(Number.isFinite)) return null;
        
        // Debug: Log positions to verify correctness
        console.log('Link positions:', {
          linkId: r.id,
          txId: r.txId,
          rxId: r.rxId,
          from: { x: fx, y: fy, z: fz },
          to: { x: tx, y: ty, z: tz },
          distance: Math.sqrt((tx-fx)**2 + (ty-fy)**2 + (tz-fz)**2)
        });
        
        return { 
          id: `${r.txId}-${r.rxId}`, 
          from: { x: fx, y: fy, z: fz }, 
          to: { x: tx, y: ty, z: tz }, 
          txId: r.txId, 
          rxId: r.rxId 
        };
      })
      .filter(Boolean);
    
    console.log('LinkBudgetBoard: Setting active links', {
      numResults: linkResults.length,
      numActive: active.length,
      satPositionKey
    });
    
    dispatch(setActiveLinks(active));
  }, [linkResults, currentStates, groundStations, dispatch, satPositionKey, referenceSystem, renderTime]);
  const latestByLink = useMemo(() => {
    const map = new Map();
    linkHistory.forEach((rec) => {
      if (!rec?.txId || !rec?.rxId) return;
      const key = `${rec.txId}-${rec.rxId}`;
      if (!map.has(key) || (rec.timestamp ?? 0) > (map.get(key).timestamp ?? 0)) {
        map.set(key, rec);
      }
    });
    return map;
  }, [linkHistory]);

  const filteredHistory = useMemo(() => {
    return linkHistory
      .filter((rec) => historyFilter === 'all' || `${rec.txId}-${rec.rxId}` === historyFilter)
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [linkHistory, historyFilter]);

  // Record link history when links are active
  useEffect(() => {
    const timestamp = Date.now();
    linkResults.forEach((result) => {
      if (result.inLink && result.ready) {
        dispatch(addLinkRecord({
          id: `${result.txId}-${result.rxId}-${timestamp}`,
          timestamp,
          txId: result.txId,
          rxId: result.rxId,
          metrics: {
            rangeKm: result.rangeKm,
            rxPowerDbm: result.rxPowerDbm,
            snrDb: result.snrDb,
            linkMargin: result.linkMargin,
            elevationDeg: result.elevationDeg,
          },
        }));
      }
    });
  }, [linkResults, dispatch]);

  return (
    <>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 1.5, 
          mb: 1, 
          mt: 8, // Add top margin to avoid header overlap
          width: 320, 
          maxHeight: 400, 
          overflow: 'auto', 
          pointerEvents: 'auto',
          backgroundColor: 'rgba(45, 55, 72, 0.95)', // Gray background like other panels
          color: '#fff',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle1" fontWeight={600}>Link Budgets</Typography>
          <Box display="flex" gap={0.5}>
            {localLinks && localLinks.length > 0 && (
              <IconButton 
                size="small" 
                onClick={handleFilterClick}
                sx={{ 
                  color: '#fff',
                  backgroundColor: selectedLinkIds.length > 0 ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                <FilterListIcon fontSize="small" />
              </IconButton>
            )}
            <Button 
              size="small" 
              onClick={() => setOpenHistory(true)} 
              variant="outlined"
              sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              HISTORY
            </Button>
          </Box>
        </Box>
        
        {(!localLinks || localLinks.length === 0) && (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>No links configured</Typography>
        )}
        {displayedLinks.map((link) => {
          const key = `${link.txId}-${link.rxId}`;
          const latest = latestByLink.get(key);
          const live = linkResults.find((r) => r.id === link.id);
          return (
            <Box 
              key={link.id || key} 
              sx={{ 
                mb: 1.5, 
                p: 1.5, 
                borderRadius: 1, 
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'rgba(0,0,0,0.2)'
              }}
            >
              <Typography variant="body2" fontWeight={600} mb={0.5}>
                {nameFor(link.txId)} → {nameFor(link.rxId)}
              </Typography>
              {live && (
                <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={0.5}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    SNR: {live.snrDb?.toFixed?.(2) ?? '–'} dB
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Margin: {live.linkMargin?.toFixed?.(2) ?? '–'} dB
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Range: {live.rangeKm?.toFixed?.(1) ?? '–'} km
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Rx Pwr: {live.rxPowerDbm?.toFixed?.(2) ?? '–'} dBm
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Ch. Loss: {live.channelLoss?.toFixed?.(2) ?? '–'} dB
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Elev: {live.elevationDeg?.toFixed?.(1) ?? '–'}°
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Photons: {live.receivedPhotonRate?.toFixed?.(2) ?? '–'} cps
                  </Typography>
                  <Typography variant="caption" sx={{ color: live.inLink ? '#4ade80' : '#f87171', gridColumn: 'span 2', textAlign: 'center', fontWeight: 600 }}>
                    {live.inLink ? 'IN LINK' : 'NO LINK'}
                  </Typography>
                </Box>
              )}
              {!live && latest && (
                <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={0.5}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    SNR: {latest.metrics?.snrDb?.toFixed?.(2) ?? '–'} dB
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Margin: {latest.metrics?.linkMargin?.toFixed?.(2) ?? '–'} dB
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Range: {latest.metrics?.rangeKm?.toFixed?.(1) ?? '–'} km
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Rx Pwr: {latest.metrics?.rxPowerDbm?.toFixed?.(2) ?? '–'} dBm
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Ch. Loss: {latest.metrics?.channelLoss?.toFixed?.(2) ?? '–'} dB
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Elev: {latest.metrics?.elevationDeg?.toFixed?.(1) ?? '–'}°
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Photons: {latest.metrics?.receivedPhotonRate?.toFixed?.(2) ?? '–'} cps
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Last: {latest.timestamp ? new Date(latest.timestamp).toLocaleTimeString() : '–'}
                  </Typography>
                </Box>
              )}
              {!live && !latest && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Waiting for data...</Typography>
              )}
            </Box>
          );
        })}
        {displayedLinks.length === 0 && localLinks.length > 0 && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', textAlign: 'center', mt: 1 }}>
            Select links from the filter above to display
          </Typography>
        )}
      </Paper>

      {/* Filter Popover */}
      <Popover
        open={openFilter}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(45, 55, 72, 0.98)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            maxHeight: 400,
            width: 300,
          }
        }}
      >
        <Box p={2}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
              Select Links
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: selectedLinkIds.length >= 3 ? '#fbbf24' : '#4ade80', 
                fontWeight: 600,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: 'rgba(0,0,0,0.3)'
              }}
            >
              {selectedLinkIds.length}/3
            </Typography>
          </Box>
          
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 1 }}>
            Select up to 3 links to display
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={0.5}>
            {localLinks.map((link) => {
              const key = `${link.txId}-${link.rxId}`;
              const isSelected = selectedLinkIds.includes(link.id);
              const isDisabled = !isSelected && selectedLinkIds.length >= 3;
              
              return (
                <FormControlLabel
                  key={link.id || key}
                  control={
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleLinkToggle(link.id)}
                      disabled={isDisabled}
                      sx={{
                        color: 'rgba(255,255,255,0.4)',
                        '&.Mui-checked': {
                          color: '#4ade80',
                        },
                        '&.Mui-disabled': {
                          color: 'rgba(255,255,255,0.2)',
                        }
                      }}
                    />
                  }
                  label={
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: isDisabled ? 'rgba(255,255,255,0.4)' : '#fff',
                        fontWeight: isSelected ? 600 : 400
                      }}
                    >
                      {nameFor(link.txId)} → {nameFor(link.rxId)}
                    </Typography>
                  }
                  sx={{
                    m: 0,
                    p: 0.75,
                    borderRadius: 0.5,
                    backgroundColor: isSelected ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                    border: isSelected ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid transparent',
                    '&:hover': {
                      backgroundColor: isDisabled ? 'transparent' : 'rgba(255,255,255,0.05)',
                    }
                  }}
                />
              );
            })}
          </Box>
          
          <Box mt={2} display="flex" justifyContent="space-between">
            <Button
              size="small"
              onClick={() => setSelectedLinkIds([])}
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Clear All
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleFilterClose}
              sx={{ 
                backgroundColor: '#4ade80',
                color: '#000',
                '&:hover': {
                  backgroundColor: '#22c55e'
                }
              }}
            >
              Done
            </Button>
          </Box>
        </Box>
      </Popover>

      <Dialog 
        open={openHistory} 
        onClose={() => setOpenHistory(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(45, 55, 72, 0.98)',
            backdropFilter: 'blur(10px)',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>Link Budget History</DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Box display="flex" gap={2} mb={2} alignItems="center">
            <Select
              size="small"
              value={historyFilter}
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
              {links?.map((link) => {
                const key = `${link.txId}-${link.rxId}`;
                return (
                  <MenuItem key={key} value={key}>
                    {nameFor(link.txId)} → {nameFor(link.rxId)}
                  </MenuItem>
                );
              })}
            </Select>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Total records: {filteredHistory.length}
            </Typography>
          </Box>
          <Table size="small" sx={{ '& .MuiTableCell-root': { color: '#fff', borderColor: 'rgba(255,255,255,0.1)' } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Transmitter</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Receiver</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Elevation</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Rx Power</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#4ade80', whiteSpace: 'nowrap' }}>Channel Loss</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: '#60a5fa', whiteSpace: 'nowrap' }}>Photon Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    No history recorded yet. Links will be recorded when in communication.
                  </TableCell>
                </TableRow>
              )}
              {filteredHistory.slice(0, 100).map((rec) => {
                const hasChannelLoss = rec.metrics?.channelLoss !== undefined && rec.metrics?.channelLoss !== null;
                const hasPhotonRate = rec.metrics?.receivedPhotonRate !== undefined && rec.metrics?.receivedPhotonRate !== null;
                
                return (
                  <TableRow key={rec.id || `${rec.txId}-${rec.rxId}-${rec.timestamp}`}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString() : '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{nameFor(rec.txId)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{nameFor(rec.rxId)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{rec.metrics?.elevationDeg?.toFixed?.(1) ?? '—'}°</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{rec.metrics?.rxPowerDbm?.toFixed?.(2) ?? '—'} dBm</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: hasChannelLoss ? 'normal' : 300 }}>
                      {hasChannelLoss ? `${rec.metrics.channelLoss.toFixed(2)} dB` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: hasPhotonRate ? 'normal' : 300 }}>
                      {hasPhotonRate ? `${rec.metrics.receivedPhotonRate.toFixed(2)} cps` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setOpenHistory(false)} sx={{ color: '#fff' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LinkBudgetBoard;
