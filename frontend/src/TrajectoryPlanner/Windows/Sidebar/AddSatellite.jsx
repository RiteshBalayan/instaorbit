import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Snackbar, Alert, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DoneIcon from '@mui/icons-material/Done';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { updateSatellite, addSatellite, deleteSatellite, updateSatellites, defaultBodyFrame, createComponent } from '../../../Store/satelliteSlice';
import { initializeParticles, deleteParticle } from '../../../Store/StateTimeSeries';
import { updateCoordinate, deleteState } from '../../../Store/CurrentState';
import { keplerianToCartesian, trueToEccentricAnomaly, eccentricToMeanAnomaly } from '../../Simulation/Functions';
import { computeGMST, eci2ecef, ecef2geodetic } from '../../../transforms';
import * as THREE from 'three';
import './SatelliteConfig.css';
import { SketchPicker } from 'react-color';

/* ─── Utility: compute LVLH (nadir-pointing) quaternion ─── */
function computeInitialLVLHQuaternion(posKm, velKms) {
  const len = (v) => Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
  const norm = (v) => { const l=len(v); return l<1e-14?[0,0,0]:[v[0]/l,v[1]/l,v[2]/l]; };
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];

  const rHat = norm(posKm);
  const zBody = [-rHat[0], -rHat[1], -rHat[2]]; // nadir
  const hVec = cross(posKm, velKms);
  const hHat = norm(hVec);
  const yBody = [-hHat[0], -hHat[1], -hHat[2]]; // -orbit-normal
  const xBody = norm(cross(yBody, zBody));        // along-track

  // Build rotation matrix columns → quaternion
  const m00=xBody[0], m01=yBody[0], m02=zBody[0];
  const m10=xBody[1], m11=yBody[1], m12=zBody[1];
  const m20=xBody[2], m21=yBody[2], m22=zBody[2];
  const trace = m00+m11+m22;
  let qx,qy,qz,qw;
  if(trace>0){const s=0.5/Math.sqrt(trace+1);qw=0.25/s;qx=(m21-m12)*s;qy=(m02-m20)*s;qz=(m10-m01)*s;}
  else if(m00>m11&&m00>m22){const s=2*Math.sqrt(1+m00-m11-m22);qw=(m21-m12)/s;qx=0.25*s;qy=(m01+m10)/s;qz=(m02+m20)/s;}
  else if(m11>m22){const s=2*Math.sqrt(1+m11-m00-m22);qw=(m02-m20)/s;qx=(m01+m10)/s;qy=0.25*s;qz=(m12+m21)/s;}
  else{const s=2*Math.sqrt(1+m22-m00-m11);qw=(m10-m01)/s;qx=(m02+m20)/s;qy=(m12+m21)/s;qz=0.25*s;}
  const ql=Math.sqrt(qx*qx+qy*qy+qz*qz+qw*qw);
  return [qx/ql, qy/ql, qz/ql, qw/ql];
}


const DragNumberInput = ({ min = 6400, max = 50000, step = 1000, value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const initialValueRef = useRef(value);
  const lastMouseXRef = useRef(null);

  // Sync internal state when parent value prop changes (e.g. external reset or edit load)
  // Only update if the value actually differs to avoid infinite re-render loops
  const prevValueRef = useRef(value);
  if (value !== prevValueRef.current) {
    prevValueRef.current = value;
    if (!isDragging && value !== currentValue) {
      setCurrentValue(value);
    }
  }

  const handleMouseDown = (e) => {
    setIsDragging(true);
    initialValueRef.current = currentValue;
    lastMouseXRef.current = e.clientX;
    document.body.style.cursor = 'ew-resize';
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseXRef.current;
    const changeValue = Math.round(deltaX / 5) * step;
    const newValue = Math.min(Math.max(initialValueRef.current + changeValue, min), max);
    setCurrentValue(newValue);
    onChange(newValue);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
  };

  const handleWheel = (e) => {
    const delta = Math.sign(e.deltaY) * step;
    const newValue = Math.min(Math.max(currentValue + delta, min), max);
    setCurrentValue(newValue);
    onChange(newValue);
  };

  return (
    <div
      className="drag-number-input-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <input
        className="detail-input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={(e) => {
          const newValue = Math.min(Math.max(Number(e.target.value), min), max);
          setCurrentValue(newValue);
          onChange(newValue);
        }}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
 *  TAB DEFINITIONS
 * ═══════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'basic',      label: 'Basic' },
  { key: 'orbital',    label: 'Orbital' },
  { key: 'burns',      label: 'Burns' },
  { key: 'pointing',   label: 'Pointing' },
  { key: 'components', label: 'Components' },
];

/* ═══════════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════ */
const AddSatellite = ({ editId = null, onClose }) => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);
  const groundStations = useSelector(state => state.groundStations?.groundStations || []);
  const [newSatelliteName, setNewSatelliteName] = useState('New_Satelite');
  const [selectedOption, setSelectedOption] = useState('InstaOrbit');
  const [time, setTime] = useState('0');
  const [ID, setID] = useState(null);
  const [bodyFrame, setBodyFrame] = useState(defaultBodyFrame());
  const [newSatelliteParams, setNewSatelliteParams] = useState({
    InitialCondition: {
      argumentOfPeriapsis: 0,
      inclination: 0,
      eccentricity: 0,
      semimajoraxis: 7000,
      assendingnode: 0,
      trueanomly: 0
    }
  });
  const satelliteConfigRef = useRef(null);
  const [color, setColor] = useState('#fff');
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const starttime = useSelector((state) => state.timer.starttime);
  const editing = editId !== null;
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [activeTab, setActiveTab] = useState('basic');
  const [livePreview, setLivePreview] = useState(false);
  const livePreviewIdRef = useRef(null);

  const resetForm = () => {
    setNewSatelliteName('New_Satelite');
    setSelectedOption('InstaOrbit');
    setTime('0');
    setColor('#fff');
    setBodyFrame(defaultBodyFrame());
    setNewSatelliteParams({
      InitialCondition: {
        argumentOfPeriapsis: 0,
        inclination: 0,
        eccentricity: 0,
        semimajoraxis: 7000,
        assendingnode: 0,
        trueanomly: 0
      }
    });
    setID(null);
    setActiveTab('basic');
  };

  useEffect(() => {
    if (editing) {
      const sat = satellitesConfig.find((s) => s.id === editId);
      if (sat) {
        setNewSatelliteName(sat.name || 'Satellite');
        setSelectedOption(sat.propagator || 'InstaOrbit');
        setTime(sat.InitialCondition?.time ?? '0');
        setColor(sat.color || '#fff');
        setBodyFrame(sat.bodyFrame ? { ...defaultBodyFrame(), ...sat.bodyFrame } : defaultBodyFrame());
        setNewSatelliteParams({
          ...sat,
          InitialCondition: {
            ...sat.InitialCondition,
            semimajoraxis: sat.InitialCondition?.semimajoraxis || 7000,
          },
        });
        setID(sat.id);
      }
    } else {
      setNewSatelliteName('New_Satelite');
      setSelectedOption('InstaOrbit');
      setTime('0');
      setColor('#fff');
      setBodyFrame(defaultBodyFrame());
      setNewSatelliteParams({
        InitialCondition: {
          argumentOfPeriapsis: 0,
          inclination: 0,
          eccentricity: 0,
          semimajoraxis: 7000,
          assendingnode: 0,
          trueanomly: 0
        }
      });
      setID(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, editId]);

  /* ── Live Preview: dispatch a preview satellite to Redux when toggled on ── */
  useEffect(() => {
    if (!livePreview) {
      // Clean up preview satellite when turning off
      if (livePreviewIdRef.current !== null && !editing) {
        dispatch(deleteSatellite(livePreviewIdRef.current));
        dispatch(deleteParticle(livePreviewIdRef.current));
        livePreviewIdRef.current = null;
      }
      return;
    }

    // Determine a stable preview ID (offset by +100 so it never collides with real IDs)
    const previewId = editing
      ? editId
      : (livePreviewIdRef.current ?? (satellitesConfig.length > 0 ? Math.max(...satellitesConfig.map(s => s.id)) + 100 : 9000));
    livePreviewIdRef.current = previewId;

    // Build preview from the same helper used by handleAddSatellite
    const previewSat = {
      ...buildSatelliteFromForm(previewId),
      name: `${newSatelliteName} (Preview)`,
      preview: true,
      Simulation: false,
      Tracktail: 0,
      burns: [],
    };

    const existingSat = satellitesConfig.find(s => s.id === previewId);
    if (existingSat) {
      dispatch(updateSatellite({ id: previewId, conf: previewSat }));
    } else {
      dispatch(addSatellite(previewSat));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livePreview, newSatelliteName, selectedOption, time, color, bodyFrame,
      newSatelliteParams]);

  /* Clean up preview on unmount */
  useEffect(() => {
    return () => {
      if (livePreviewIdRef.current !== null && !editing) {
        dispatch(deleteSatellite(livePreviewIdRef.current));
        dispatch(deleteParticle(livePreviewIdRef.current));
      }
    };
  }, []);

  const colorButtonRef = useRef(null);
  const handleColorChange = (color) => setColor(color.hex);
  const handleClick = (e) => { e.stopPropagation(); setDisplayColorPicker(!displayColorPicker); };
  const handleClose = () => setDisplayColorPicker(false);
  const getPickerPosition = () => {
    if (colorButtonRef.current) {
      const rect = colorButtonRef.current.getBoundingClientRect();
      return { top: rect.bottom + 5, left: rect.left };
    }
    return { top: 100, left: 100 };
  };

  /**
   * Build a satellite config object from the current form state.
   * This is a pure read of React state — it does NOT dispatch to Redux or
   * mutate any state.  Both preview and final-save use this as the single
   * source of truth so the values can never diverge.
   */
  const buildSatelliteFromForm = (id) => ({
    id,
    name: newSatelliteName,
    propagator: selectedOption,
    InitialCondition: {
      argumentOfPeriapsis: newSatelliteParams.InitialCondition.argumentOfPeriapsis,
      trueanomly:          newSatelliteParams.InitialCondition.trueanomly,
      eccentricity:        newSatelliteParams.InitialCondition.eccentricity,
      semimajoraxis:       newSatelliteParams.InitialCondition.semimajoraxis,
      assendingnode:       newSatelliteParams.InitialCondition.assendingnode,
      inclination:         newSatelliteParams.InitialCondition.inclination,
      time: time,
    },
    color,
    Simulation: true,
    Tracktail: 1000,
    FutureTrack: false,
    Tube: false,
    burns: newSatelliteParams.burns || [],
    bodyFrame,
  });

  const handleAddSatellite = () => {
    if (newSatelliteName.trim() === '' || selectedOption === '' || time === null) {
      alert('All fields are required');
      return;
    }

    const ic = newSatelliteParams.InitialCondition;
    if (!Number.isFinite(ic.semimajoraxis) || ic.semimajoraxis <= 0) {
      handleParameterChange('semimajoraxis', 7000);
      return;
    }
    if (ic.eccentricity < 0 || ic.eccentricity >= 1) {
      alert('⚠️ Eccentricity must be between 0 and 1.');
      return;
    }
    const EARTH_RADIUS_KM = 6378.137;
    const perigeeRadius = ic.semimajoraxis * (1 - ic.eccentricity);
    if (perigeeRadius < EARTH_RADIUS_KM) {
      alert('⚠️ Orbit passes through Earth! Adjust parameters.');
      return;
    }
    const perigeeAlt = perigeeRadius - EARTH_RADIUS_KM;
    if (perigeeAlt < 160) {
      if (!window.confirm(`⚠️ Very low orbit (${perigeeAlt.toFixed(0)} km perigee). Continue?`)) return;
    }

    // ── Clean up any live-preview satellite ──────────────────
    const previewId = livePreviewIdRef.current;
    if (previewId !== null && !editing) {
      dispatch(deleteSatellite(previewId));
      dispatch(deleteParticle(previewId));
      livePreviewIdRef.current = null;
    }

    // ── Determine satellite ID ──────────────────────────────
    const realConfigs = satellitesConfig.filter(s => s.id !== previewId);
    const satId = editing
      ? editId
      : (realConfigs.length > 0 ? Math.max(...realConfigs.map(s => s.id)) + 1 : 0);
    setID(satId);

    // ── Build satellite config from form state ──────────────
    const sat = { ...buildSatelliteFromForm(satId), preview: false };

    // ── Compute orbital mechanics ───────────────────────────
    const SM = ic.semimajoraxis;
    const incRad = THREE.MathUtils.degToRad(ic.inclination);
    const aopRad = THREE.MathUtils.degToRad(ic.argumentOfPeriapsis);
    const raanRad = THREE.MathUtils.degToRad(ic.assendingnode);
    const taRad = THREE.MathUtils.degToRad(ic.trueanomly);
    const eccAnom = trueToEccentricAnomaly(taRad, ic.eccentricity);
    const meanAnom = eccentricToMeanAnomaly(eccAnom, ic.eccentricity);

    const elements = { a: SM, e: ic.eccentricity, M: meanAnom, Ω: raanRad, ω: aopRad, i: incRad };
    const [position, velocity] = keplerianToCartesian(elements);
    const [posKmX, posKmY, posKmZ] = position;
    const [velKmsX, velKmsY, velKmsZ] = velocity;

    const initQ = computeInitialLVLHQuaternion(position, velocity);

    const gmst0 = computeGMST(starttime || Date.now());
    const ecef0 = eci2ecef(position, gmst0);
    const geo0  = ecef2geodetic(ecef0);

    const initialTracePoint = {
      time: 0,
      x: posKmX / 3185.5, y: posKmY / 3185.5, z: posKmZ / 3185.5,
      mapX: (geo0.lon / 180) * 7.5, mapY: (geo0.lat / 90) * 3.75,
      lat: geo0.lat, lon: geo0.lon, alt: geo0.alt,
      qx: initQ[0], qy: initQ[1], qz: initQ[2], qw: initQ[3],
    };

    const coordPayload = {
      id: satId,
      timefix: null,
      coordinates: initialTracePoint,
      velocity: [velKmsX, velKmsY, velKmsZ],
      attitude: { quaternion: initQ },
      elements: { a: SM, e: ic.eccentricity, ν: taRad, Ω: raanRad, ω: aopRad, i: incRad },
    };

    // ── Dispatch to Redux ────────────────────────────────────
    if (editing) {
      dispatch(updateSatellite({ id: satId, conf: sat }));
      dispatch(deleteParticle(satId));
    } else {
      dispatch(addSatellite(sat));
    }
    dispatch(initializeParticles({ id: satId, name: newSatelliteName, tracePoints: [initialTracePoint] }));
    dispatch(updateCoordinate(coordPayload));

    if (onClose) onClose();
  };

  const persistBurns = (burns) => {
    setNewSatelliteParams((prev) => ({ ...prev, burns }));
    if (editing) {
      const newConfig = satellitesConfig.map((s) => s.id === editId ? { ...s, burns } : s);
      dispatch(updateSatellites(newConfig));
    }
  };

  const handleAddBurnQuick = () => {
    const burns = newSatelliteParams.burns || [];
    const newId = burns.length > 0 ? Math.max(...burns.map((b) => b.id ?? 0)) + 1 : 0;
    persistBurns([...burns, { id: newId, x: 0, y: 0, z: 0, time: elapsedTime ?? 0, previewMode: true }]);
    setToast({ open: true, message: `Burn added.`, severity: 'info' });
  };

  const handleBurnChange = (id, field, value) => {
    const burns = newSatelliteParams.burns || [];
    persistBurns(burns.map((b) => b.id === id ? { ...b, [field]: Number(value) || 0 } : b));
  };

  const handleBurnDelete = (id) => {
    persistBurns((newSatelliteParams.burns || []).filter((b) => b.id !== id));
  };

  const handleParameterChange = (field, value) => {
    const updatedParams = {
      ...newSatelliteParams,
      InitialCondition: { ...newSatelliteParams.InitialCondition, [field]: parseFloat(value) },
    };
    setNewSatelliteParams(updatedParams);
    if (editing && ID !== null) dispatch(updateSatellite({ id: ID, conf: updatedParams }));
  };

  /* ═══════════════════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════════════════ */
  return (
    <div className="satellite-config sat-edit-sidebar" ref={satelliteConfigRef}>
      {/* ── Tab strip ───────────────────────────────────────── */}
      <div className="sat-tab-strip">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`sat-tab-btn${activeTab === tab.key ? ' sat-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="sat-tab-content">
        {/* ═══ BASIC TAB ════════════════════════════════════════ */}
        {activeTab === 'basic' && (
          <div className="input-container">
            <h3>Satellite Details</h3>
            <div className="detail-row">
              <label className="detail-label">Name</label>
              <input type="text" placeholder="Satellite Name" value={newSatelliteName} onChange={(e) => setNewSatelliteName(e.target.value)} className="name-input" />
            </div>
            <div className="options">
              <h4>Propagator</h4>
              <label><input type="radio" value="InstaOrbit" checked={selectedOption === 'InstaOrbit'} onChange={() => setSelectedOption('InstaOrbit')} /> InstaOrbit</label>
              <label><input type="radio" value="SGP4" checked={selectedOption === 'SGP4'} onChange={() => setSelectedOption('SGP4')} /> SGP4</label>
            </div>
            <div className="detail-row">
              <label className="detail-label">Init Time (s)</label>
              <input type="number" value={time || ''} onChange={(e) => setTime(e.target.value)} className="name-input" />
            </div>
            <div className="detail-row">
              <label className="detail-label">Color</label>
              <div style={{ position: 'relative' }}>
                <div ref={colorButtonRef} onClick={handleClick} style={{ backgroundColor: color, width: '36px', height: '36px', border: '2px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }} />
                {displayColorPicker && (() => {
                  const pos = getPickerPosition();
                  return (<>
                    <div onClick={handleClose} style={{ position:'fixed',top:0,right:0,bottom:0,left:0,zIndex:9998 }} />
                    <div style={{ position:'fixed',top:`${pos.top}px`,left:`${pos.left}px`,zIndex:9999,boxShadow:'0 4px 12px rgba(0,0,0,0.5)' }}>
                      <SketchPicker color={color} onChange={handleColorChange} />
                    </div>
                  </>);
                })()}
              </div>
            </div>
            <h3 style={{ marginTop: '12px' }}>Body Frame</h3>
            <div className='detail-row'>
              <label className='detail-label'>Shape</label>
              <select className='name-input' value={bodyFrame.bodyShape} onChange={(e) => setBodyFrame(prev => ({ ...prev, bodyShape: e.target.value }))}
                style={{ padding:'6px 10px',borderRadius:'6px',border:'1px solid #d1d5db',background:'#1a1a2e',color:'#fff',cursor:'pointer' }}>
                <option value="rectangle">Rectangle (Box)</option>
                <option value="cone">Cone</option>
                <option value="circle">Sphere</option>
              </select>
            </div>
          </div>
        )}

        {/* ═══ ORBITAL TAB ══════════════════════════════════════ */}
        {activeTab === 'orbital' && (
          <div className="input-container">
            <h3>Orbital Elements</h3>
            <div className='detail-row'><label className='detail-label'>Semi-major Axis (km)</label><DragNumberInput min={6400} max={50000} step={100} value={newSatelliteParams.InitialCondition.semimajoraxis} onChange={(v) => handleParameterChange('semimajoraxis', v)} /></div>
            <div className='detail-row'><label className='detail-label'>Eccentricity</label><DragNumberInput min={0} max={1} step={0.01} value={newSatelliteParams.InitialCondition.eccentricity} onChange={(v) => handleParameterChange('eccentricity', v)} /></div>
            {(() => {
              const a = newSatelliteParams.InitialCondition.semimajoraxis;
              const e = newSatelliteParams.InitialCondition.eccentricity;
              const perigee = a * (1 - e) - 6378.137;
              const apogee = a * (1 + e) - 6378.137;
              const period = 2 * Math.PI * Math.sqrt(a**3 / 398600.4418) / 60;
              return (
                <div style={{ margin:'8px 0',padding:'10px',background:'rgba(0,0,0,0.15)',borderRadius:'8px',fontSize:'12px' }}>
                  <div>Perigee: <b style={{ color: perigee < 0 ? '#ef4444' : '#4ade80' }}>{perigee.toFixed(1)} km</b></div>
                  <div>Apogee: <b>{apogee.toFixed(1)} km</b></div>
                  <div>Period: <b>{period.toFixed(1)} min</b></div>
                </div>
              );
            })()}
            <div className='detail-row'><label className='detail-label'>True Anomaly (°)</label><DragNumberInput min={0} max={360} step={1} value={newSatelliteParams.InitialCondition.trueanomly} onChange={(v) => handleParameterChange('trueanomly', v)} /></div>
            <div className='detail-row'><label className='detail-label'>Inclination (°)</label><DragNumberInput min={0} max={360} step={1} value={newSatelliteParams.InitialCondition.inclination} onChange={(v) => handleParameterChange('inclination', v)} /></div>
            <div className='detail-row'><label className='detail-label'>Arg of Periapsis (°)</label><DragNumberInput min={0} max={360} step={1} value={newSatelliteParams.InitialCondition.argumentOfPeriapsis} onChange={(v) => handleParameterChange('argumentOfPeriapsis', v)} /></div>
            <div className='detail-row'><label className='detail-label'>RAAN (°)</label><DragNumberInput min={0} max={360} step={1} value={newSatelliteParams.InitialCondition.assendingnode} onChange={(v) => handleParameterChange('assendingnode', v)} /></div>
          </div>
        )}

        {/* ═══ BURNS TAB ════════════════════════════════════════ */}
        {activeTab === 'burns' && (
          <div className="input-container">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <h3>Burns & Maneuvers</h3>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleAddBurnQuick}>Add Burn</Button>
            </div>
            {(newSatelliteParams.burns || []).length === 0 && <Typography variant="caption" sx={{ color:'#9ca3af',display:'block',mt:1 }}>No burns configured.</Typography>}
            {(newSatelliteParams.burns || []).map((burn) => (
              <div key={burn.id} style={{ background:'#16213e',border:'1px solid #374151',borderRadius:'8px',padding:'10px',marginBottom:'8px' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px' }}>
                  <span style={{ fontSize:'11px',fontWeight:600,color:'#f59e0b' }}>BURN #{burn.id}</span>
                  <Button size="small" color="error" onClick={() => handleBurnDelete(burn.id)} sx={{ minWidth:'28px',p:'2px' }}><DeleteOutlineIcon sx={{ fontSize:16 }} /></Button>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px' }}>
                  {[['Time (s)','time'],['Δv X','x'],['Δv Y','y'],['Δv Z','z']].map(([lbl,f])=>(
                    <div key={f} className='detail-row' style={{ marginBottom:'0' }}>
                      <label className='detail-label' style={{ fontSize:'11px' }}>{lbl}</label>
                      <input type="number" className="name-input" value={burn[f]??0} onChange={(e) => handleBurnChange(burn.id, f, e.target.value)}
                        style={{ width:'70px',padding:'4px 6px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'11px' }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ POINTING TAB ═════════════════════════════════════ */}
        {activeTab === 'pointing' && (
          <div className="input-container">
            <h3>Body Pointing Logic</h3>
            <div className='detail-row'>
              <label className='detail-label'>Mode</label>
              <select className='name-input' value={bodyFrame.pointingMode} onChange={(e) => setBodyFrame(prev => ({ ...prev, pointingMode: e.target.value }))}
                style={{ padding:'6px 10px',borderRadius:'6px',border:'1px solid #d1d5db',background:'#1a1a2e',color:'#fff',cursor:'pointer' }}>
                <option value="nadir">Nadir (Earth-pointing)</option>
                <option value="target">Target Tracking</option>
              </select>
            </div>
            <div className='detail-row'>
              <label className='detail-label'>Slew Rate (°/s)</label>
              <DragNumberInput min={0.1} max={30} step={0.1} value={bodyFrame.slewRateDegSec} onChange={(v) => setBodyFrame(prev => ({ ...prev, slewRateDegSec: v }))} />
            </div>

            {bodyFrame.pointingMode === 'target' && (
              <div style={{ marginTop:'8px',width:'100%' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px' }}>
                  <h4 style={{ margin:0 }}>Body Targets</h4>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => {
                    const targets = bodyFrame.pointingTargets || [];
                    const newId = targets.length > 0 ? Math.max(...targets.map(t => t.id ?? 0)) + 1 : 0;
                    setBodyFrame(prev => ({ ...prev, pointingTargets: [...prev.pointingTargets, { id: newId, targetType: 'satellite', targetId: null, conditions: { minElevationDeg: 5 }, priority: targets.length + 1 }] }));
                  }}>Add Target</Button>
                </div>
                {bodyFrame.pointingTargets.length === 0 && <Typography variant="caption" sx={{ color:'#9ca3af',display:'block',mb:1 }}>No targets. Falls back to nadir.</Typography>}
                {bodyFrame.pointingTargets.map((target, idx) => (
                  <div key={target.id} style={{ background:'#16213e',border:'1px solid #374151',borderRadius:'8px',padding:'10px',marginBottom:'8px' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px' }}>
                      <span style={{ fontSize:'11px',fontWeight:600,color:'#8b5cf6' }}>Priority #{idx + 1}</span>
                      <div style={{ display:'flex',gap:'2px' }}>
                        <Button size="small" disabled={idx===0} onClick={() => { const arr=[...bodyFrame.pointingTargets];[arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]];setBodyFrame(prev=>({...prev,pointingTargets:arr})); }} sx={{ minWidth:'28px',p:'2px' }}><ArrowUpwardIcon sx={{ fontSize:16 }} /></Button>
                        <Button size="small" disabled={idx===bodyFrame.pointingTargets.length-1} onClick={() => { const arr=[...bodyFrame.pointingTargets];[arr[idx],arr[idx+1]]=[arr[idx+1],arr[idx]];setBodyFrame(prev=>({...prev,pointingTargets:arr})); }} sx={{ minWidth:'28px',p:'2px' }}><ArrowDownwardIcon sx={{ fontSize:16 }} /></Button>
                        <Button size="small" color="error" onClick={() => setBodyFrame(prev=>({...prev,pointingTargets:prev.pointingTargets.filter(t=>t.id!==target.id)}))} sx={{ minWidth:'28px',p:'2px' }}><DeleteOutlineIcon sx={{ fontSize:16 }} /></Button>
                      </div>
                    </div>
                    <div className='detail-row' style={{ marginBottom:'4px' }}>
                      <label className='detail-label' style={{ fontSize:'12px' }}>Type</label>
                      <select className='name-input' value={target.targetType} onChange={(e) => { const arr=bodyFrame.pointingTargets.map(t=>t.id===target.id?{...t,targetType:e.target.value,targetId:null}:t);setBodyFrame(prev=>({...prev,pointingTargets:arr})); }}
                        style={{ padding:'4px 8px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'12px' }}>
                        <option value="satellite">Satellite</option><option value="groundStation">Ground Station</option>
                      </select>
                    </div>
                    <div className='detail-row' style={{ marginBottom:'4px' }}>
                      <label className='detail-label' style={{ fontSize:'12px' }}>Target</label>
                      <select className='name-input' value={target.targetId??''} onChange={(e) => { const arr=bodyFrame.pointingTargets.map(t=>t.id===target.id?{...t,targetId:e.target.value?Number(e.target.value):null}:t);setBodyFrame(prev=>({...prev,pointingTargets:arr})); }}
                        style={{ padding:'4px 8px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'12px' }}>
                        <option value="">— Select —</option>
                        {target.targetType==='satellite' ? satellitesConfig.filter(s=>s.id!==(editing?editId:ID)).map(s=>(<option key={s.id} value={s.id}>{s.name||`Sat ${s.id}`}</option>)) : groundStations.map(gs=>(<option key={gs.id} value={gs.id}>{gs.name||`GS ${gs.id}`}</option>))}
                      </select>
                    </div>
                    <div className='detail-row' style={{ marginBottom:'0' }}>
                      <label className='detail-label' style={{ fontSize:'12px' }}>Min Elev (°)</label>
                      <input type="number" className='name-input' value={target.conditions?.minElevationDeg??5} min={0} max={90} step={1}
                        onChange={(e) => { const arr=bodyFrame.pointingTargets.map(t=>t.id===target.id?{...t,conditions:{...t.conditions,minElevationDeg:Number(e.target.value)||0}}:t);setBodyFrame(prev=>({...prev,pointingTargets:arr})); }}
                        style={{ width:'70px',padding:'4px 8px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'12px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Component pointing inline */}
            {(bodyFrame.components || []).length > 0 && (
              <div style={{ marginTop:'16px' }}>
                <h3>Component Pointing</h3>
                {(bodyFrame.components || []).map((comp) => (
                  <div key={comp.id} style={{ background:'#16213e',border:'1px solid #374151',borderRadius:'8px',padding:'10px',marginBottom:'8px' }}>
                    <span style={{ fontSize:'11px',fontWeight:600,color:comp.type==='solarPanel'?'#3b82f6':'#ef4444',display:'block',marginBottom:'6px' }}>{comp.name}</span>
                    <div className='detail-row' style={{ marginBottom:'4px' }}>
                      <label className='detail-label' style={{ fontSize:'12px' }}>Mode</label>
                      <select className='name-input' value={comp.pointingMode} onChange={(e) => { const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,pointingMode:e.target.value}:c);setBodyFrame(prev=>({...prev,components:arr})); }}
                        style={{ padding:'4px 8px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'12px' }}>
                        <option value="default">{comp.type==='solarPanel'?'Sun (Default)':'Nadir (Default)'}</option>
                        <option value="target">Target Tracking</option>
                        <option value="fixed">Fixed Angle</option>
                      </select>
                    </div>
                    {comp.pointingMode==='fixed' && (
                      <div style={{ display:'flex',gap:'8px',marginTop:'4px' }}>
                        <div className='detail-row' style={{ flex:1,marginBottom:0 }}>
                          <label className='detail-label' style={{ fontSize:'11px' }}>A1 (°)</label>
                          <input type="number" className='name-input' value={comp.fixedAnglesDeg?.a1??0} step={5}
                            onChange={(e) => { const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,fixedAnglesDeg:{...(c.fixedAnglesDeg||{}),a1:Number(e.target.value)||0}}:c);setBodyFrame(prev=>({...prev,components:arr})); }}
                            style={{ width:'60px',padding:'4px 6px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'11px' }} />
                        </div>
                        {comp.dof===2 && (
                          <div className='detail-row' style={{ flex:1,marginBottom:0 }}>
                            <label className='detail-label' style={{ fontSize:'11px' }}>A2 (°)</label>
                            <input type="number" className='name-input' value={comp.fixedAnglesDeg?.a2??0} step={5}
                              onChange={(e) => { const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,fixedAnglesDeg:{...(c.fixedAnglesDeg||{}),a2:Number(e.target.value)||0}}:c);setBodyFrame(prev=>({...prev,components:arr})); }}
                              style={{ width:'60px',padding:'4px 6px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'11px' }} />
                          </div>
                        )}
                      </div>
                    )}
                    {comp.pointingMode==='target' && (
                      <div style={{ marginTop:'6px' }}>
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px' }}>
                          <span style={{ fontSize:'11px',color:'#9ca3af' }}>Targets</span>
                          <Button size="small" variant="text" onClick={() => {
                            const targets=comp.pointingTargets||[];
                            const newId=targets.length>0?Math.max(...targets.map(t=>t.id??0))+1:0;
                            const arr=(bodyFrame.components||[]).map(c=>c.id!==comp.id?c:{...c,pointingTargets:[...(c.pointingTargets||[]),{id:newId,targetType:comp.type==='solarPanel'?'sun':'groundStation',targetId:null,conditions:{minElevationDeg:5},priority:targets.length+1}]});
                            setBodyFrame(prev=>({...prev,components:arr}));
                          }} sx={{ fontSize:'11px',minWidth:'auto',p:'2px 6px' }}>+ Target</Button>
                        </div>
                        {(comp.pointingTargets||[]).map(tgt=>(
                          <div key={tgt.id} style={{ background:'#0f172a',borderRadius:'6px',padding:'6px',marginBottom:'4px',display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap' }}>
                            <select value={tgt.targetType} onChange={(e) => { const arr=(bodyFrame.components||[]).map(c=>c.id!==comp.id?c:{...c,pointingTargets:(c.pointingTargets||[]).map(t=>t.id===tgt.id?{...t,targetType:e.target.value,targetId:null}:t)});setBodyFrame(prev=>({...prev,components:arr})); }}
                              style={{ padding:'2px 4px',borderRadius:'4px',border:'1px solid #374151',background:'#1a1a2e',color:'#fff',fontSize:'11px' }}>
                              <option value="sun">Sun</option><option value="satellite">Satellite</option><option value="groundStation">Ground Station</option>
                            </select>
                            {tgt.targetType!=='sun' && (
                              <select value={tgt.targetId??''} onChange={(e) => { const arr=(bodyFrame.components||[]).map(c=>c.id!==comp.id?c:{...c,pointingTargets:(c.pointingTargets||[]).map(t=>t.id===tgt.id?{...t,targetId:e.target.value?Number(e.target.value):null}:t)});setBodyFrame(prev=>({...prev,components:arr})); }}
                                style={{ padding:'2px 4px',borderRadius:'4px',border:'1px solid #374151',background:'#1a1a2e',color:'#fff',fontSize:'11px',flex:1 }}>
                                <option value="">— Select —</option>
                                {tgt.targetType==='satellite' ? satellitesConfig.filter(s=>s.id!==(editing?editId:ID)).map(s=>(<option key={s.id} value={s.id}>{s.name||`Sat ${s.id}`}</option>)) : groundStations.map(gs=>(<option key={gs.id} value={gs.id}>{gs.name||`GS ${gs.id}`}</option>))}
                              </select>
                            )}
                            <Button size="small" color="error" onClick={() => { const arr=(bodyFrame.components||[]).map(c=>c.id!==comp.id?c:{...c,pointingTargets:(c.pointingTargets||[]).filter(t=>t.id!==tgt.id)});setBodyFrame(prev=>({...prev,components:arr})); }} sx={{ minWidth:'24px',p:'1px' }}>✕</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ COMPONENTS TAB ═══════════════════════════════════ */}
        {activeTab === 'components' && (
          <div className="input-container">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <h3>Satellite Components</h3>
            </div>
            <div style={{ display:'flex',gap:'4px',marginBottom:'8px' }}>
              <Button size="small" variant="outlined" onClick={() => {
                const isEven = (bodyFrame.components||[]).length % 2 === 0;
                const axis = isEven ? '+Y' : '-Y';
                const dir = isEven ? [0, 1, 0] : [0, -1, 0];
                const comp = createComponent({ name: `Solar Panel ${(bodyFrame.components||[]).length+1}`, type: 'solarPanel', parentAxis: axis, axisDirection: dir, positionOffset: [dir[0]*0.04, dir[1]*0.04, dir[2]*0.04] });
                setBodyFrame(prev => ({ ...prev, components: [...(prev.components||[]), comp] }));
              }}>+ Solar Panel</Button>
              <Button size="small" variant="outlined" onClick={() => {
                const comp = createComponent({ name: `Laser ${(bodyFrame.components||[]).length+1}`, type: 'laserPointer', parentAxis: '+Z', axisDirection: [0, 0, 1], positionOffset: [0, 0, 0.03], dof: 2, offset: 0.03, slewRateDegSec: 10 });
                setBodyFrame(prev => ({ ...prev, components: [...(prev.components||[]), comp] }));
              }}>+ Laser Pointer</Button>
            </div>
            <Typography variant="caption" sx={{ color:'#9ca3af',display:'block',mb:1 }}>
              {(bodyFrame.components||[]).length === 0 ? 'No components. Default panels shown.' : `${(bodyFrame.components||[]).length} component(s)`}
            </Typography>
            {(bodyFrame.components||[]).map(comp => (
              <div key={comp.id} style={{ background:'#16213e',border:'1px solid #374151',borderRadius:'8px',padding:'10px',marginBottom:'8px' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px' }}>
                  <span style={{ fontSize:'11px',fontWeight:600,color:comp.type==='solarPanel'?'#3b82f6':'#ef4444',textTransform:'uppercase' }}>
                    {comp.type==='solarPanel'?'☀ Solar Panel':'🎯 Laser Pointer'} · {comp.dof}-DOF
                  </span>
                  <Button size="small" color="error" onClick={() => setBodyFrame(prev=>({...prev,components:(prev.components||[]).filter(c=>c.id!==comp.id)}))} sx={{ minWidth:'28px',p:'2px' }}><DeleteOutlineIcon sx={{ fontSize:16 }} /></Button>
                </div>
                <div className='detail-row' style={{ marginBottom:'4px' }}>
                  <label className='detail-label' style={{ fontSize:'12px' }}>Name</label>
                  <input type="text" className='name-input' value={comp.name}
                    onChange={(e) => { const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,name:e.target.value}:c);setBodyFrame(prev=>({...prev,components:arr})); }}
                    style={{ padding:'4px 8px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'12px' }} />
                </div>
                {/* ── Mount Axis Preset ─────────────────────────────── */}
                {(() => {
                  const presetDirs = { '+X':[1,0,0], '-X':[-1,0,0], '+Y':[0,1,0], '-Y':[0,-1,0], '+Z':[0,0,1], '-Z':[0,0,-1] };
                  const dir = comp.axisDirection || [0,1,0];
                  const matchedPreset = Object.entries(presetDirs).find(([,d]) => d[0]===dir[0] && d[1]===dir[1] && d[2]===dir[2]);
                  const isCustom = !matchedPreset;
                  return (
                    <>
                      <div className='detail-row' style={{ marginBottom:'4px' }}>
                        <label className='detail-label' style={{ fontSize:'12px' }}>Mount Axis</label>
                        <div style={{ display:'flex',gap:'4px',alignItems:'center' }}>
                          <select className='name-input' value={isCustom ? '__custom__' : comp.parentAxis}
                            onChange={(e) => {
                              if (e.target.value === '__custom__') return;
                              const d = presetDirs[e.target.value] || [0,1,0];
                              const off = comp.offset || 0.04;
                              const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c, parentAxis:e.target.value, axisDirection:d, positionOffset:[d[0]*off, d[1]*off, d[2]*off]}:c);
                              setBodyFrame(prev=>({...prev,components:arr}));
                            }}
                            style={{ padding:'4px 8px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'12px',flex:1 }}>
                            <option value="+X">+X  →  [1, 0, 0]</option>
                            <option value="-X">−X  →  [−1, 0, 0]</option>
                            <option value="+Y">+Y  →  [0, 1, 0]</option>
                            <option value="-Y">−Y  →  [0, −1, 0]</option>
                            <option value="+Z">+Z  →  [0, 0, 1]</option>
                            <option value="-Z">−Z  →  [0, 0, −1]</option>
                            {isCustom && <option value="__custom__">Custom [{dir.map(v=>v.toFixed(2)).join(', ')}]</option>}
                          </select>
                        </div>
                      </div>
                      {/* Resolved values summary */}
                      <div style={{ background:'rgba(0,0,0,0.2)',borderRadius:'4px',padding:'4px 8px',margin:'2px 0 6px',fontSize:'10px',color:'#64748b',display:'flex',justifyContent:'space-between' }}>
                        <span>Dir: [{dir.map(v => v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)).join(', ')}]</span>
                        <span>Pos: [{(comp.positionOffset||[0,0,0]).map(v => v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3)).join(', ')}]</span>
                      </div>
                    </>
                  );
                })()}

                {/* ── 6-DOF Fine-tune Editor (collapsible) ─────────── */}
                <details style={{ margin:'4px 0' }}>
                  <summary style={{ fontSize:'10px',fontWeight:600,color:'#8f94fb',cursor:'pointer',userSelect:'none',padding:'4px 0' }}>
                    ▸ Fine-tune Axis &amp; Position
                  </summary>
                  <div style={{ background:'#0f172a',borderRadius:'6px',padding:'8px',marginTop:'4px' }}>
                    <span style={{ fontSize:'10px',fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:'6px' }}>Axis Direction</span>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'4px' }}>
                      {['X','Y','Z'].map((label, idx) => (
                        <div key={label} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'2px' }}>
                          <span style={{ fontSize:'10px',fontWeight:600,color:['#ef4444','#22c55e','#3b82f6'][idx] }}>{label}</span>
                          <DragNumberInput
                            min={-1} max={1} step={0.01}
                            value={comp.axisDirection ? comp.axisDirection[idx] : [0,1,0][idx]}
                            onChange={(v) => {
                              const newDir = [...(comp.axisDirection || [0,1,0])];
                              newDir[idx] = v;
                              const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,axisDirection:newDir}:c);
                              setBodyFrame(prev=>({...prev,components:arr}));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize:'10px',fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginTop:'8px',marginBottom:'6px' }}>Position Offset</span>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'4px' }}>
                      {['X','Y','Z'].map((label, idx) => (
                        <div key={label} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'2px' }}>
                          <span style={{ fontSize:'10px',fontWeight:600,color:['#ef4444','#22c55e','#3b82f6'][idx] }}>{label}</span>
                          <DragNumberInput
                            min={-0.2} max={0.2} step={0.005}
                            value={comp.positionOffset ? comp.positionOffset[idx] : 0}
                            onChange={(v) => {
                              const newOff = [...(comp.positionOffset || [0,0,0])];
                              newOff[idx] = v;
                              const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,positionOffset:newOff}:c);
                              setBodyFrame(prev=>({...prev,components:arr}));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </details>

                {/* ── Constraint ranges ─────────────────────── */}
                <div style={{ marginBottom:'6px' }}>
                  <label className='detail-label' style={{ fontSize:'12px', marginBottom:'4px', display:'block' }}>
                    {comp.type === 'laserPointer' ? 'Pointing Constraints' : 'Rotation Range'} (°)
                  </label>
                  {/* A1 range — always shown */}
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px', paddingLeft:'4px' }}>
                    <span style={{ fontSize:'10px', color:'#94a3b8', width:'58px' }}>
                      {comp.type === 'laserPointer' ? 'Az (a1):' : 'Range (a1):'}
                    </span>
                    <input type="number" value={comp.constraint?.minA1Deg ?? -90} min={-180} max={0} step={5}
                      onChange={(e) => { const v=Number(e.target.value); const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,constraint:{...c.constraint,minA1Deg:v}}:c);setBodyFrame(prev=>({...prev,components:arr})); }}
                      style={{ width:'50px',padding:'3px 6px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'11px',textAlign:'center' }}
                    />
                    <span style={{ fontSize:'10px', color:'#64748b' }}>to</span>
                    <input type="number" value={comp.constraint?.maxA1Deg ?? 90} min={0} max={180} step={5}
                      onChange={(e) => { const v=Number(e.target.value); const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,constraint:{...c.constraint,maxA1Deg:v}}:c);setBodyFrame(prev=>({...prev,components:arr})); }}
                      style={{ width:'50px',padding:'3px 6px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'11px',textAlign:'center' }}
                    />
                  </div>
                  {/* A2 range — only for 2-DOF (laser) */}
                  {(comp.type === 'laserPointer' || comp.dof === 2) && (
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px', paddingLeft:'4px' }}>
                      <span style={{ fontSize:'10px', color:'#94a3b8', width:'58px' }}>El (a2):</span>
                      <input type="number" value={comp.constraint?.minA2Deg ?? -10} min={-90} max={0} step={5}
                        onChange={(e) => { const v=Number(e.target.value); const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,constraint:{...c.constraint,minA2Deg:v}}:c);setBodyFrame(prev=>({...prev,components:arr})); }}
                        style={{ width:'50px',padding:'3px 6px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'11px',textAlign:'center' }}
                      />
                      <span style={{ fontSize:'10px', color:'#64748b' }}>to</span>
                      <input type="number" value={comp.constraint?.maxA2Deg ?? 80} min={0} max={90} step={5}
                        onChange={(e) => { const v=Number(e.target.value); const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,constraint:{...c.constraint,maxA2Deg:v}}:c);setBodyFrame(prev=>({...prev,components:arr})); }}
                        style={{ width:'50px',padding:'3px 6px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'11px',textAlign:'center' }}
                      />
                    </div>
                  )}
                  <div style={{ fontSize:'9px', color:'#64748b', paddingLeft:'4px', lineHeight:'1.3' }}>
                    {comp.type === 'laserPointer'
                      ? 'Az: full sweep around mount axis. El: tilt toward mount (+) or away (−). Keep max < 90° to prevent beam through body.'
                      : 'How far the panel can rotate from its rest position around the mount axis.'}
                  </div>
                </div>

                <div className='detail-row' style={{ marginBottom:'4px' }}>
                  <label className='detail-label' style={{ fontSize:'12px' }}>Slew Rate (°/s)</label>
                  <input type="number" className='name-input' value={comp.slewRateDegSec??5} min={0.1} max={100} step={0.5}
                    onChange={(e) => { const arr=(bodyFrame.components||[]).map(c=>c.id===comp.id?{...c,slewRateDegSec:Number(e.target.value)||5}:c);setBodyFrame(prev=>({...prev,components:arr})); }}
                    style={{ width:'70px',padding:'4px 8px',borderRadius:'4px',border:'1px solid #374151',background:'#0f172a',color:'#fff',fontSize:'12px' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Action buttons (sticky bottom) ─────────────────── */}
      <div className="sat-edit-actions">
        <Button
          variant={livePreview ? 'contained' : 'outlined'}
          color={livePreview ? 'info' : 'inherit'}
          size="small"
          startIcon={livePreview ? <VisibilityIcon /> : <VisibilityOffIcon />}
          onClick={() => setLivePreview(prev => !prev)}
          sx={{ fontSize:'11px', textTransform:'none' }}
        >
          {livePreview ? 'Preview On' : 'Preview'}
        </Button>
        <Button variant="contained" color="secondary" endIcon={<DoneIcon />} onClick={() => { setLivePreview(false); handleAddSatellite(); }} size="small">
          {editing ? 'Save' : 'Add Satellite'}
        </Button>
        {editing && (
          <Button variant="outlined" color="error" size="small" onClick={() => {
            setLivePreview(false);
            dispatch(deleteSatellite(editId)); dispatch(deleteParticle(editId)); dispatch(deleteState(editId));
            if (onClose) onClose();
          }}>Delete</Button>
        )}
        {!editing && <Button variant="outlined" size="small" onClick={() => { setLivePreview(false); resetForm(); }}>Clear</Button>}
      </div>

      <Snackbar open={toast.open} autoHideDuration={2500} onClose={() => setToast(t => ({ ...t, open: false }))} anchorOrigin={{ vertical:'bottom',horizontal:'center' }}>
        <Alert severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))} sx={{ width:'100%' }}>{toast.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default AddSatellite;
