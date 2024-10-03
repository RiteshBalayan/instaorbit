import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DoneIcon from '@mui/icons-material/Done';
import { updateSatellite, togglePreview, addSatellite } from '../../Store/satelliteSlice';
import { initializeParticles, resetTracePoints, deleteParticle } from '../../Store/StateTimeSeries';
import { updateCoordinate, deleteState } from '../../Store/CurrentState';
import { keplerianToCartesian, keplerianToCartesianTrueAnomly, trueToEccentricAnomaly, eccentricToMeanAnomaly } from '../Simulation/Functions';
import * as THREE from 'three';
import './SatelliteConfig.css';
// Import the necessary components from react-color
import { SketchPicker } from 'react-color';
import NumericInput from 'react-numeric-input';
import { useDrag } from '@use-gesture/react';



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







const AddSatellite = () => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);
  const [newSatelliteName, setNewSatelliteName] = useState('New_Satelite');
  const [showNameInput, setShowNameInput] = useState(false);
  const [selectedOption, setSelectedOption] = useState('InstaOrbit');
  const [time, setTime] = useState('0');
  const [showParameterInput, setShowParameterInput] = useState(false);
  const [ID, setID] = useState(null);
  const [newSatelliteParams, setNewSatelliteParams] = useState({
    InitialCondition: {
      argumentOfPeriapsis: 0,
      inclination: 0,
      eccentricity: 0,
      semimajoraxis: 0,
      assendingnode: 0,
      trueanomly: 0
    }
  });
  const [activeSatellite, setActiveSatellite] = useState(null);
  const satelliteConfigRef = useRef(null);
  // State to manage the selected color
  const [color, setColor] = useState('#fff'); // Default color is white
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const referenceSystem = useSelector((state) => state.view.ReferenceSystem);
  const elapsedTime = useSelector((state) => state.timer.elapsedTime);

  const handleAddSatelliteClick = () => {
    setShowNameInput(true);
  };

    // Function to handle color changes
    const handleColorChange = (color) => {
      setColor(color.hex);
    };
    // Function to toggle the color picker
    const handleClick = () => {
      setDisplayColorPicker(!displayColorPicker);
    };
  
    // Function to close the color picker
    const handleClose = () => {
      setDisplayColorPicker(false);
    };


  const handleNextStep = () => {
    if (newSatelliteName.trim() === '' || selectedOption === '' || time === null) {
      alert('All fields are required');
      return;
    }
    setShowParameterInput(true);
    const newId = satellitesConfig.length > 0 ? satellitesConfig[satellitesConfig.length - 1].id + 1 : 0;
    setID(newId);
    const newSatellite = {
      id: newId,
      name: newSatelliteName,
      propagator: selectedOption,
      preview: true,
      InitialCondition: {      
        argumentOfPeriapsis: 0,
        trueanomly: 0,
        eccentricity: 0,
        semimajoraxis: 0,
        assendingnode: 0,
        inclination: 0,
        time: time, // Time in seconds
      },
      color: color,
    };
    setNewSatelliteParams(newSatellite);
    dispatch(addSatellite(newSatellite));
    dispatch(updateCoordinate({ 
      id: newId, 
      timefix: null, 
      elements: { a:0 ,e:0 ,i:0 ,Ω:0 ,ω:0 ,ν: 0},
      
     }));
  };

  const handleAddSatellite = () => {
    const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2
    const SM = newSatelliteParams.InitialCondition.semimajoraxis;

    const inclination = THREE.MathUtils.degToRad(newSatelliteParams.InitialCondition.inclination);
    const argumentOfPeriapsis = THREE.MathUtils.degToRad(newSatelliteParams.InitialCondition.argumentOfPeriapsis);
    const assendingnode = THREE.MathUtils.degToRad(newSatelliteParams.InitialCondition.assendingnode);
    const trueanomly = THREE.MathUtils.degToRad(newSatelliteParams.InitialCondition.trueanomly);
      // Calculate Mean anomaly
    let eccentricanomly = trueToEccentricAnomaly(trueanomly, newSatelliteParams.InitialCondition.eccentricity);
    let meananomly = eccentricToMeanAnomaly(eccentricanomly, newSatelliteParams.InitialCondition.eccentricity);

    const radiansPerSecond = 2 * Math.PI / (24 * 60 * 60);  // Radians per second for a 24-hour cycle
    const radiansPerMicrosecond = radiansPerSecond;   // Convert to radians per microsecond



    const elements = {
      a: SM,
      e: newSatelliteParams.InitialCondition.eccentricity,
      M: meananomly,
      Ω: assendingnode,
      ω: argumentOfPeriapsis,
      i: inclination
    };

    const [position, velocity] = keplerianToCartesian(elements);
    let newX, newY, newZ;
    [newX, newY, newZ] = position;
    newX /= 3185.5;
    newY /= 3185.5;
    newZ /= 3185.5;

    dispatch(togglePreview({id: ID, preview: false}));
    dispatch(initializeParticles({ id: ID, name: newSatelliteName, tracePoints: [{ time: 0, x: 0, y: 0, z: 0, mapX: 0, mapY: 0 }] }));
    dispatch(updateCoordinate({ 
      id: ID, 
      timefix: null, 
      coordinates: { time: 0, x: newX, y: newY, z: newZ, mapX: 0, mapY: 0 }, 
      velocity: null,
      elements: {
        a: SM,
        e: newSatelliteParams.InitialCondition.eccentricity,
        ν: trueanomly,
        Ω: assendingnode,
        ω: argumentOfPeriapsis,
        i: inclination 
    } }));
    setShowNameInput(false);
    setShowParameterInput(false);
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
    dispatch(updateSatellite({ id: ID, conf: updatedParams }));
  };



  return (
    <div className="satellite-config" ref={satelliteConfigRef}>
      <div className="input-container">
        {showNameInput && !showParameterInput && (
          <>
            <h3>Satellite Name</h3>
            <input
              type="text"
              placeholder="Satellite Name"
              value={newSatelliteName}
              onChange={(e) => setNewSatelliteName(e.target.value)}
              className="name-input"
            />
            <div className="options">
              <h3>Select Propagator</h3>
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
            <h3>Initialization Time</h3>
              <input
                type="number"
                value={time || ''}
                onChange={(e) => setTime(e.target.value)}
                placeholder="Enter Time in Seconds"
                className="name-input"
              />
            <h3>Select Color</h3>
              <div>
                <div onClick={handleClick} style={{ backgroundColor: color, width: '30px', height: '30px', border: '1px solid black' }}></div>
                {displayColorPicker && (
                  <div style={{ position: 'absolute', zIndex: 2 }}>
                    <div onClick={handleClose} style={{ position: 'fixed', top: '0px', right: '0px', bottom: '0px', left: '0px' }} />
                    <SketchPicker color={color}  
                    onChange={handleColorChange}  
                    />
                  </div>
                )}
              </div>
            <Button
              variant="contained"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNextStep}
              style={{ marginTop: '10px' }}
            >
              Next
            </Button>
          </>
        )}
        {showParameterInput && (
          <>
            <h3>Add Initial Condition</h3>
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
            <Button
              variant="contained"
              color="secondary"
              endIcon={<DoneIcon />}
              onClick={handleAddSatellite}
              style={{ marginTop: '10px' }}
            >
              Done
            </Button>
          </>
        )}
        {!showNameInput && !showParameterInput && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddSatelliteClick}
          >
            Add Satellite
          </Button>
        )}
      </div>
    </div>
  );
};

export default AddSatellite;
