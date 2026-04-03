import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Snackbar, Alert, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DoneIcon from '@mui/icons-material/Done';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { updateSatellite, togglePreview, addSatellite, deleteSatellite, updateSatellites, defaultBodyFrame } from '../../../Store/satelliteSlice';
import { initializeParticles, deleteParticle, resetTracePoints } from '../../../Store/StateTimeSeries';
import { updateCoordinate, deleteState } from '../../../Store/CurrentState';
import { keplerianToCartesian, trueToEccentricAnomaly, eccentricToMeanAnomaly } from '../../Simulation/Functions';
import { computeGMST, eci2ecef, ecef2geodetic } from '../../../transforms';
import * as THREE from 'three';
import './SatelliteConfig.css';
import { SketchPicker } from 'react-color';



const DragNumberInput = ({ min = 6400, max = 50000, step = 1000, value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const initialValueRef = useRef(value); // Store initial value on drag start
  const lastMouseXRef = useRef(null); // Store the last mouse X position

  // Start dragging
  const handleMouseDown = (e) => {
    setIsDragging(true);
    initialValueRef.current = currentValue; // Store the initial value
    lastMouseXRef.current = e.clientX; // Store initial mouse position
    document.body.style.cursor = 'ew-resize'; // Change cursor to indicate dragging
  };

  // Handle dragging (mouse movement)
  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMouseXRef.current; // Calculate horizontal mouse movement
    const changeValue = Math.round(deltaX / 5) * step; // Adjust sensitivity (dividing by 5)
    const newValue = Math.min(Math.max(initialValueRef.current + changeValue, min), max);

    setCurrentValue(newValue);
    onChange(newValue);
  };

  // Stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default'; // Reset cursor
  };

  // Handle mouse scroll
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
  // State to manage the selected color
  const [color, setColor] = useState('#fff'); // Default color is white
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);
  const starttime = useSelector((state) => state.timer.starttime);
  const editing = editId !== null;
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

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
        // reset for add
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
  }, [editing, editId, satellitesConfig]);

  // Ref for color picker positioning
  const colorButtonRef = useRef(null);

  // Function to handle color changes
  const handleColorChange = (color) => {
    setColor(color.hex);
  };
  
  // Function to toggle the color picker
  const handleClick = (e) => {
    e.stopPropagation();
    setDisplayColorPicker(!displayColorPicker);
  };

  // Function to close the color picker
  const handleClose = () => {
    setDisplayColorPicker(false);
  };
  
  // Get picker position dynamically
  const getPickerPosition = () => {
    if (colorButtonRef.current) {
      const rect = colorButtonRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + 5,
        left: rect.left
      };
    }
    return { top: 100, left: 100 }; // fallback position
  };


  const ensureIdAndPersistBase = () => {
    const newId = editing ? editId : (satellitesConfig.length > 0 ? satellitesConfig[satellitesConfig.length - 1].id + 1 : 0);
    setID(newId);
    const baseSatellite = {
      id: newId,
      name: newSatelliteName,
      propagator: selectedOption,
      preview: true,
      InitialCondition: {      
        argumentOfPeriapsis: newSatelliteParams?.InitialCondition?.argumentOfPeriapsis || 0,
        trueanomly: newSatelliteParams?.InitialCondition?.trueanomly || 0,
        eccentricity: newSatelliteParams?.InitialCondition?.eccentricity || 0,
        semimajoraxis: newSatelliteParams?.InitialCondition?.semimajoraxis || 7000,
        assendingnode: newSatelliteParams?.InitialCondition?.assendingnode || 0,
        inclination: newSatelliteParams?.InitialCondition?.inclination || 0,
        time: time, // Time in seconds
      },
      color: color,
      Simulation: true,
      Tracktail: 1000,
      FutureTrack: false,
      Tube: false,
      burns: newSatelliteParams?.burns || [],
      bodyFrame: bodyFrame,
    };
    setNewSatelliteParams(baseSatellite);
    if (!editing) {
      dispatch(addSatellite(baseSatellite));
      dispatch(updateCoordinate({ 
        id: newId, 
        timefix: null, 
        elements: { a:0 ,e:0 ,i:0 ,Ω:0 ,ω:0 ,ν: 0},
      }));
    }
    return baseSatellite;
  };

  const handleAddSatellite = () => {
    if (newSatelliteName.trim() === '' || selectedOption === '' || time === null) {
      alert('All fields are required');
      return;
    }
    if (!Number.isFinite(newSatelliteParams.InitialCondition.semimajoraxis) || newSatelliteParams.InitialCondition.semimajoraxis <= 0) {
      handleParameterChange('semimajoraxis', 7000);
      return;
    }
    
    // Validate eccentricity for elliptical orbit
    const eccentricity = newSatelliteParams.InitialCondition.eccentricity;
    if (eccentricity < 0 || eccentricity >= 1) {
      alert(
        `⚠️ Invalid Eccentricity!\n\n` +
        `Eccentricity must be between 0 and 1 for elliptical orbits.\n` +
        `Current value: ${eccentricity}\n\n` +
        `• e = 0: Circular orbit\n` +
        `• 0 < e < 1: Elliptical orbit\n` +
        `• e = 1: Parabolic trajectory (escape)\n` +
        `• e > 1: Hyperbolic trajectory (escape)\n\n` +
        `Please adjust the eccentricity to a value between 0 and 0.99.`
      );
      return;
    }
    
    // Check if orbit goes inside Earth
    const EARTH_RADIUS_KM = 6378.137;
    const semiMajorAxis = newSatelliteParams.InitialCondition.semimajoraxis;
    
    // Calculate perigee radius (closest point to Earth)
    const perigeeRadius = semiMajorAxis * (1 - eccentricity);
    const perigeeAltitude = perigeeRadius - EARTH_RADIUS_KM;
    
    if (perigeeRadius < EARTH_RADIUS_KM) {
      const minSemiMajorAxis = EARTH_RADIUS_KM / (1 - eccentricity);
      alert(
        `⚠️ Invalid Orbit: The orbit passes through Earth!\n\n` +
        `Current perigee altitude: ${perigeeAltitude.toFixed(2)} km (${Math.abs(perigeeAltitude).toFixed(2)} km BELOW surface)\n` +
        `Earth radius: ${EARTH_RADIUS_KM} km\n` +
        `Perigee radius: ${perigeeRadius.toFixed(2)} km\n\n` +
        `To fix this orbit:\n` +
        `• Increase semi-major axis to at least ${minSemiMajorAxis.toFixed(2)} km, OR\n` +
        `• Decrease eccentricity to ${((semiMajorAxis - EARTH_RADIUS_KM) / semiMajorAxis).toFixed(4)} or lower\n\n` +
        `Recommended: Set semi-major axis to ${Math.max(minSemiMajorAxis + 200, 6578).toFixed(0)} km for a safe 200 km altitude orbit.`
      );
      return;
    }
    
    // Warn if orbit is too low (below typical LEO)
    if (perigeeAltitude < 160) {
      const confirm = window.confirm(
        `⚠️ Warning: Very Low Orbit!\n\n` +
        `Perigee altitude: ${perigeeAltitude.toFixed(2)} km\n\n` +
        `Orbits below 160 km altitude experience significant atmospheric drag and will decay rapidly.\n` +
        `The International Space Station orbits at ~400 km altitude.\n\n` +
        `Do you want to continue with this low orbit?`
      );
      if (!confirm) return;
    }
    
    const baseSatellite = ensureIdAndPersistBase();
    const SM = baseSatellite.InitialCondition.semimajoraxis;

    const inclination = THREE.MathUtils.degToRad(baseSatellite.InitialCondition.inclination);
    const argumentOfPeriapsis = THREE.MathUtils.degToRad(baseSatellite.InitialCondition.argumentOfPeriapsis);
    const assendingnode = THREE.MathUtils.degToRad(baseSatellite.InitialCondition.assendingnode);
    const trueanomly = THREE.MathUtils.degToRad(baseSatellite.InitialCondition.trueanomly);
      // Calculate Mean anomaly
    let eccentricanomly = trueToEccentricAnomaly(trueanomly, baseSatellite.InitialCondition.eccentricity);
    let meananomly = eccentricToMeanAnomaly(eccentricanomly, baseSatellite.InitialCondition.eccentricity);


    const elements = {
      a: SM,
      e: baseSatellite.InitialCondition.eccentricity,
      M: meananomly,
      Ω: assendingnode,
      ω: argumentOfPeriapsis,
      i: inclination
    };

    const [position, velocity] = keplerianToCartesian(elements);
    const [posKmX, posKmY, posKmZ] = position;  // km (ECI)
    let newX = posKmX / 3185.5;
    let newY = posKmY / 3185.5;
    let newZ = posKmZ / 3185.5;

    // Compute geodetic lat/lon for the initial trace point so
    // the 2D ground track also starts at the real position.
    const gmst0 = computeGMST(starttime || Date.now());
    const ecef0 = eci2ecef([posKmX, posKmY, posKmZ], gmst0);
    const geo0  = ecef2geodetic(ecef0);
    const mapX0 = (geo0.lon / 180) * 7.5;
    const mapY0 = (geo0.lat / 90) * 3.75;

    if (editing) {
      dispatch(updateSatellite({ id: baseSatellite.id, conf: { ...baseSatellite, InitialCondition: baseSatellite.InitialCondition } }));
      // Delete and recreate particle to ensure fresh trace points
      dispatch(deleteParticle(baseSatellite.id));
      dispatch(initializeParticles({ id: baseSatellite.id, name: newSatelliteName, tracePoints: [{ time: 0, x: newX, y: newY, z: newZ, mapX: mapX0, mapY: mapY0, lat: geo0.lat, lon: geo0.lon, alt: geo0.alt }] }));
      dispatch(updateCoordinate({ 
        id: baseSatellite.id, 
        timefix: null, 
        coordinates: { time: 0, x: newX, y: newY, z: newZ, mapX: mapX0, mapY: mapY0, lat: geo0.lat, lon: geo0.lon, alt: geo0.alt }, 
        velocity: null,
        elements: {
          a: SM,
          e: baseSatellite.InitialCondition.eccentricity,
          ν: trueanomly,
          Ω: assendingnode,
          ω: argumentOfPeriapsis,
          i: inclination 
      } }));
    } else {
      dispatch(togglePreview({id: baseSatellite.id, preview: false}));
      dispatch(initializeParticles({ id: baseSatellite.id, name: newSatelliteName, tracePoints: [{ time: 0, x: newX, y: newY, z: newZ, mapX: mapX0, mapY: mapY0, lat: geo0.lat, lon: geo0.lon, alt: geo0.alt }] }));
      dispatch(updateCoordinate({ 
        id: baseSatellite.id, 
        timefix: null, 
        coordinates: { time: 0, x: newX, y: newY, z: newZ, mapX: mapX0, mapY: mapY0, lat: geo0.lat, lon: geo0.lon, alt: geo0.alt }, 
        velocity: null,
        elements: {
          a: SM,
          e: newSatelliteParams.InitialCondition.eccentricity,
          ν: trueanomly,
          Ω: assendingnode,
          ω: argumentOfPeriapsis,
          i: inclination 
      } }));
    }
    if (onClose) onClose();
  };

  const persistBurns = (burns) => {
    setNewSatelliteParams((prev) => ({ ...prev, burns }));
    if (editing) {
      const newConfig = satellitesConfig.map((s) =>
        s.id === editId ? { ...s, burns } : s
      );
      dispatch(updateSatellites(newConfig));
    }
  };

  const handleAddBurnQuick = () => {
    const burns = newSatelliteParams.burns || [];
    const newId = burns.length > 0 ? Math.max(...burns.map((b) => b.id ?? 0)) + 1 : 0;
    const newBurn = {
      id: newId,
      x: 0,
      y: 0,
      z: 0,
      time: elapsedTime ?? 0,
      previewMode: true,
    };
    persistBurns([...burns, newBurn]);
    setToast({ open: true, message: `Burn ${newId} added. Set Δv/time to apply.`, severity: 'info' });
  };

  const handleBurnChange = (id, field, value) => {
    const burns = newSatelliteParams.burns || [];
    const updated = burns.map((b) =>
      b.id === id ? { ...b, [field]: Number(value) || 0 } : b
    );
    persistBurns(updated);
  };

  const handleBurnDelete = (id) => {
    const burns = newSatelliteParams.burns || [];
    persistBurns(burns.filter((b) => b.id !== id));
    setToast({ open: true, message: `Burn ${id} removed.`, severity: 'info' });
  };

  const handleParameterChange = (field, value) => {
    const updatedInitialCondition = {
      ...newSatelliteParams.InitialCondition,
      [field]: parseFloat(value),
    };
  
    const updatedParams = {
      ...newSatelliteParams,
      InitialCondition: updatedInitialCondition,
    };
  
    setNewSatelliteParams(updatedParams);
    if (editing && ID !== null) {
      dispatch(updateSatellite({ id: ID, conf: updatedParams }));
    }
  };



  return (
    <div className="satellite-config" ref={satelliteConfigRef}>
      <div className="input-container">
        {editing && (
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-end', mb: 1 }}>
            Burns: {(newSatelliteParams.burns || []).length}
          </Typography>
        )}
        <h3>Satellite Details</h3>
        <div className="detail-row">
          <label className="detail-label">Satellite Name</label>
          <input
            type="text"
            placeholder="Satellite Name"
            value={newSatelliteName}
            onChange={(e) => setNewSatelliteName(e.target.value)}
            className="name-input"
          />
        </div>

        <div className="options">
          <h4>Select Propagator</h4>
          <label>
            <input
              type="radio"
              value="InstaOrbit"
              checked={selectedOption === 'InstaOrbit'}
              onChange={() => setSelectedOption('InstaOrbit')}
            />
            InstaOrbit Propagator
          </label>
          <label>
            <input
              type="radio"
              value="SGP4"
              checked={selectedOption === 'SGP4'}
              onChange={() => setSelectedOption('SGP4')}
            />
            SGP4 Propagator
          </label>
        </div>

        <div className="detail-row">
          <label className="detail-label">Initialization Time (s)</label>
          <input
            type="number"
            value={time || ''}
            onChange={(e) => setTime(e.target.value)}
            placeholder="Enter time in seconds"
            className="name-input"
          />
        </div>

        <div className="detail-row">
          <label className="detail-label">Select Color</label>
          <div style={{ position: 'relative' }}>
            <div 
              ref={colorButtonRef}
              onClick={handleClick} 
              style={{ 
                backgroundColor: color, 
                width: '40px', 
                height: '40px', 
                border: '2px solid #d1d5db', 
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
            {displayColorPicker && (() => {
              const pos = getPickerPosition();
              return (
                <>
                  <div 
                    onClick={handleClose} 
                    style={{ 
                      position: 'fixed', 
                      top: '0px', 
                      right: '0px', 
                      bottom: '0px', 
                      left: '0px',
                      zIndex: 9998,
                      backgroundColor: 'transparent'
                    }} 
                  />
                  <div style={{ 
                    position: 'fixed', 
                    top: `${pos.top}px`, 
                    left: `${pos.left}px`,
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}>
                    <SketchPicker color={color} onChange={handleColorChange} />
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <h3 style={{ marginTop: '16px' }}>Add Initial Condition</h3>
        <div key={'semimajoraxis'} className='detail-row'>
          <label className='detail-label'>
            Semi-major Axis
          </label>
          <DragNumberInput className="detail-input"
            min={6400}
            max={50000}
            step={100}
            value={newSatelliteParams.InitialCondition.semimajoraxis}
            onChange={(newValue) => handleParameterChange('semimajoraxis', newValue)}
          />
        </div>
        <div key={'eccentricity'} className='detail-row'>
          <label className='detail-label'>
            Eccentricity
          </label>
          <DragNumberInput className="detail-input"
            min={0}
            max={1}
            step={0.01}
            value={newSatelliteParams.InitialCondition['eccentricity']}
            onChange={(newValue) => handleParameterChange('eccentricity', newValue)}
          />
        </div>
        
        {/* Orbital Parameters Info Display */}
        <div style={{ 
          marginTop: '12px', 
          marginBottom: '12px', 
          padding: '12px', 
          backgroundColor: '#f0f4f8', 
          borderRadius: '8px',
          border: '1px solid #d1d5db'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
            Orbital Parameters
          </div>
          {(() => {
            const EARTH_RADIUS_KM = 6378.137;
            const mu = 398600.4418; // Earth's gravitational parameter (km³/s²)
            const a = newSatelliteParams.InitialCondition.semimajoraxis;
            const e = newSatelliteParams.InitialCondition.eccentricity;
            
            const perigeeRadius = a * (1 - e);
            const apogeeRadius = a * (1 + e);
            const perigeeAltitude = perigeeRadius - EARTH_RADIUS_KM;
            const apogeeAltitude = apogeeRadius - EARTH_RADIUS_KM;
            const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu) / 60; // in minutes
            
            const isInvalid = perigeeRadius < EARTH_RADIUS_KM || e >= 1 || e < 0;
            const isLowOrbit = perigeeAltitude < 160 && perigeeAltitude >= 0;
            
            return (
              <div style={{ fontSize: '12px', color: '#374151' }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#6b7280' }}>Perigee Altitude: </span>
                  <span style={{ 
                    fontWeight: 600,
                    color: isInvalid ? '#ef4444' : isLowOrbit ? '#f59e0b' : '#4ade80'
                  }}>
                    {perigeeAltitude.toFixed(2)} km
                    {isInvalid && ' ⚠️ BELOW EARTH!'}
                    {isLowOrbit && ' ⚠️ Very Low'}
                  </span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#6b7280' }}>Apogee Altitude: </span>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>
                    {apogeeAltitude.toFixed(2)} km
                  </span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#6b7280' }}>Orbital Period: </span>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>
                    {orbitalPeriod.toFixed(2)} minutes ({(orbitalPeriod / 60).toFixed(2)} hours)
                  </span>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Orbit Type: </span>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>
                    {e === 0 ? 'Circular' : e < 0.25 ? 'Near-Circular' : e < 0.5 ? 'Elliptical' : e < 1 ? 'High Eccentricity' : 'Invalid (e ≥ 1)'}
                  </span>
                </div>
                {isInvalid && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '6px', 
                    backgroundColor: '#fef2f2',
                    borderRadius: '4px',
                    border: '1px solid #fecaca',
                    fontSize: '11px',
                    color: '#dc2626'
                  }}>
                    This orbit is invalid and cannot be created. Adjust parameters above.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        
        <div key={'trueanomly'} className='detail-row'>
          <label className='detail-label'>
            True Anomaly
          </label>
          <DragNumberInput className="detail-input"
            min={0}
            max={360}
            step={1}
            value={newSatelliteParams.InitialCondition['trueanomly']}
            onChange={(newValue) => handleParameterChange('trueanomly', newValue)}
          />
        </div>
        <div key={'inclination'} className='detail-row'>
          <label className='detail-label'>
            Inclination
          </label>
          <DragNumberInput className="detail-input"
            min={0}
            max={360}
            step={1}
            value={newSatelliteParams.InitialCondition['inclination']}
            onChange={(newValue) => handleParameterChange('inclination', newValue)}
          />
        </div>
        <div key={'argumentOfPeriapsis'} className='detail-row'>
          <label className='detail-label'>
            Argument of Periapsis
          </label>
          <DragNumberInput className="detail-input"
            min={0}
            max={360}
            step={1}
            value={newSatelliteParams.InitialCondition['argumentOfPeriapsis']}
            onChange={(newValue) => handleParameterChange('argumentOfPeriapsis', newValue)}
          />
        </div>
        <div key={'assendingnode'} className='detail-row'>
          <label className='detail-label'>
            Assending Node
          </label>
          <DragNumberInput className="detail-input"
            min={0}
            max={360}
            step={1}
            value={newSatelliteParams.InitialCondition['assendingnode']}
            onChange={(newValue) => handleParameterChange('assendingnode', newValue)}
          />
        </div>

        {/* ─── Body Frame Configuration ──────────────────────────── */}
        <h3 style={{ marginTop: '16px' }}>Body Frame</h3>

        {/* Body Shape */}
        <div className='detail-row'>
          <label className='detail-label'>Body Shape</label>
          <select
            className='name-input'
            value={bodyFrame.bodyShape}
            onChange={(e) => setBodyFrame(prev => ({ ...prev, bodyShape: e.target.value }))}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#1a1a2e', color: '#fff', cursor: 'pointer' }}
          >
            <option value="rectangle">Rectangle (Box)</option>
            <option value="cone">Cone</option>
            <option value="circle">Sphere (Default Model)</option>
          </select>
        </div>

        {/* Pointing Mode */}
        <div className='detail-row'>
          <label className='detail-label'>Pointing Mode</label>
          <select
            className='name-input'
            value={bodyFrame.pointingMode}
            onChange={(e) => setBodyFrame(prev => ({ ...prev, pointingMode: e.target.value }))}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#1a1a2e', color: '#fff', cursor: 'pointer' }}
          >
            <option value="nadir">Nadir (Earth-pointing)</option>
            <option value="target">Target Tracking</option>
          </select>
        </div>

        {/* Slew Rate */}
        <div className='detail-row'>
          <label className='detail-label'>Slew Rate (°/s)</label>
          <DragNumberInput
            min={0.1}
            max={30}
            step={0.1}
            value={bodyFrame.slewRateDegSec}
            onChange={(v) => setBodyFrame(prev => ({ ...prev, slewRateDegSec: v }))}
          />
        </div>

        {/* Pointing Targets (only show when mode is 'target') */}
        {bodyFrame.pointingMode === 'target' && (
          <div style={{ marginTop: '8px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h4 style={{ margin: 0 }}>Pointing Targets</h4>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  const targets = bodyFrame.pointingTargets || [];
                  const newId = targets.length > 0 ? Math.max(...targets.map(t => t.id ?? 0)) + 1 : 0;
                  setBodyFrame(prev => ({
                    ...prev,
                    pointingTargets: [
                      ...prev.pointingTargets,
                      {
                        id: newId,
                        targetType: 'satellite',
                        targetId: null,
                        conditions: { minElevationDeg: 5 },
                        priority: targets.length + 1,
                      },
                    ],
                  }));
                }}
              >
                Add Target
              </Button>
            </div>

            {bodyFrame.pointingTargets.length === 0 && (
              <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 1 }}>
                No targets configured. The satellite will fall back to nadir pointing.
              </Typography>
            )}

            {bodyFrame.pointingTargets.map((target, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === bodyFrame.pointingTargets.length - 1;

              return (
                <div
                  key={target.id}
                  style={{
                    background: '#16213e',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '8px',
                  }}
                >
                  {/* Priority badge + actions row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase' }}>
                      Priority #{idx + 1}
                    </span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <Button
                        size="small"
                        disabled={isFirst}
                        onClick={() => {
                          const arr = [...bodyFrame.pointingTargets];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          setBodyFrame(prev => ({ ...prev, pointingTargets: arr }));
                        }}
                        sx={{ minWidth: '28px', p: '2px' }}
                      >
                        <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                      </Button>
                      <Button
                        size="small"
                        disabled={isLast}
                        onClick={() => {
                          const arr = [...bodyFrame.pointingTargets];
                          [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                          setBodyFrame(prev => ({ ...prev, pointingTargets: arr }));
                        }}
                        sx={{ minWidth: '28px', p: '2px' }}
                      >
                        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          setBodyFrame(prev => ({
                            ...prev,
                            pointingTargets: prev.pointingTargets.filter(t => t.id !== target.id),
                          }));
                        }}
                        sx={{ minWidth: '28px', p: '2px' }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </Button>
                    </div>
                  </div>

                  {/* Target type */}
                  <div className='detail-row' style={{ marginBottom: '4px' }}>
                    <label className='detail-label' style={{ fontSize: '12px' }}>Type</label>
                    <select
                      className='name-input'
                      value={target.targetType}
                      onChange={(e) => {
                        const arr = bodyFrame.pointingTargets.map(t =>
                          t.id === target.id ? { ...t, targetType: e.target.value, targetId: null } : t
                        );
                        setBodyFrame(prev => ({ ...prev, pointingTargets: arr }));
                      }}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #374151', background: '#0f172a', color: '#fff', fontSize: '12px' }}
                    >
                      <option value="satellite">Satellite</option>
                      <option value="groundStation">Ground Station</option>
                    </select>
                  </div>

                  {/* Target ID selector */}
                  <div className='detail-row' style={{ marginBottom: '4px' }}>
                    <label className='detail-label' style={{ fontSize: '12px' }}>Target</label>
                    <select
                      className='name-input'
                      value={target.targetId ?? ''}
                      onChange={(e) => {
                        const arr = bodyFrame.pointingTargets.map(t =>
                          t.id === target.id ? { ...t, targetId: e.target.value ? Number(e.target.value) : null } : t
                        );
                        setBodyFrame(prev => ({ ...prev, pointingTargets: arr }));
                      }}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #374151', background: '#0f172a', color: '#fff', fontSize: '12px' }}
                    >
                      <option value="">— Select —</option>
                      {target.targetType === 'satellite'
                        ? satellitesConfig
                            .filter(s => s.id !== (editing ? editId : ID))
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.name || `Sat ${s.id}`}</option>
                            ))
                        : groundStations.map(gs => (
                            <option key={gs.id} value={gs.id}>{gs.name || `GS ${gs.id}`}</option>
                          ))
                      }
                    </select>
                  </div>

                  {/* Min elevation condition */}
                  <div className='detail-row' style={{ marginBottom: '0' }}>
                    <label className='detail-label' style={{ fontSize: '12px' }}>Min Elevation (°)</label>
                    <input
                      type="number"
                      className='name-input'
                      value={target.conditions?.minElevationDeg ?? 5}
                      min={0}
                      max={90}
                      step={1}
                      onChange={(e) => {
                        const arr = bodyFrame.pointingTargets.map(t =>
                          t.id === target.id
                            ? { ...t, conditions: { ...t.conditions, minElevationDeg: Number(e.target.value) || 0 } }
                            : t
                        );
                        setBodyFrame(prev => ({ ...prev, pointingTargets: arr }));
                      }}
                      style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #374151', background: '#0f172a', color: '#fff', fontSize: '12px' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="button-row" style={{ gap: '8px', marginTop: '16px', display: 'flex', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="secondary"
            endIcon={<DoneIcon />}
            onClick={handleAddSatellite}
          >
            {editing ? 'Save Changes' : 'Add Satellite'}
          </Button>
          {editing && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                dispatch(deleteSatellite(editId));
                dispatch(deleteParticle(editId));
                dispatch(deleteState(editId));
                if (onClose) onClose();
              }}
            >
              Delete Satellite
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddBurnQuick}
            title="Add a burn slot to edit Δv/time"
          >
            Add Burn
          </Button>
          {!editing && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={resetForm}
            >
              Clear
            </Button>
          )}
        </div>

        {(newSatelliteParams.burns || []).length > 0 && (
          <div style={{ marginTop: '12px', width: '100%' }}>
            <h4>Burns</h4>
            {(newSatelliteParams.burns || []).map((burn) => (
              <div key={burn.id} className="burn-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <Typography variant="caption">Time (s)</Typography>
                  <input
                    type="number"
                    className="name-input"
                    value={burn.time ?? 0}
                    onChange={(e) => handleBurnChange(burn.id, 'time', e.target.value)}
                  />
                </div>
                <div>
                  <Typography variant="caption">Δv X (m/s)</Typography>
                  <input
                    type="number"
                    className="name-input"
                    value={burn.x ?? 0}
                    onChange={(e) => handleBurnChange(burn.id, 'x', e.target.value)}
                  />
                </div>
                <div>
                  <Typography variant="caption">Δv Y (m/s)</Typography>
                  <input
                    type="number"
                    className="name-input"
                    value={burn.y ?? 0}
                    onChange={(e) => handleBurnChange(burn.id, 'y', e.target.value)}
                  />
                </div>
                <div>
                  <Typography variant="caption">Δv Z (m/s)</Typography>
                  <input
                    type="number"
                    className="name-input"
                    value={burn.z ?? 0}
                    onChange={(e) => handleBurnChange(burn.id, 'z', e.target.value)}
                  />
                </div>
                <Button color="error" size="small" onClick={() => handleBurnDelete(burn.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AddSatellite;
