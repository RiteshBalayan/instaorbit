// src/components/SatelliteConfig.js
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DateTime from 'react-datetime';
import "react-datetime/css/react-datetime.css";
import moment from 'moment';
import { updateSatellite, updateSatellites, togglePreview  } from '../../Store/satelliteSlice';
import { initializeParticles, resetTracePoints, deleteParticle } from '../../Store/StateTimeSeries';
import { updateCoordinate, deleteState} from '../../Store/CurrentState';
import { keplerianToCartesian } from './Functions';
import * as THREE from 'three';
import './SatelliteConfig.css';

const AddSatellite = () => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);
  const [newSatelliteName, setNewSatelliteName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [time, setTime] = useState(null);
  const [showParameterInput, setShowParameterInput] = useState(false);
  const [ID, setID] = useState(null);
  const [newSatelliteParams, setNewSatelliteParams] = useState({
    argumentOfPeriapsis: 0,
    inclination: 0,
    eccentricity: 0,
    semimajoraxis: 0,
    assendingnode: 0,
    trueanomly: 0,
  });
  const [activeSatellite, setActiveSatellite] = useState(null);
  const satelliteConfigRef = useRef(null);

  const handleAddSatelliteClick = () => {
    setShowNameInput(true);
  };

  const handleNextStep = () => {
    if (newSatelliteName.trim() === '' || selectedOption === '' || time === null) {
      alert('All fields are required');
      return;
    }
    setShowParameterInput(true);
    const newId = satellitesConfig.length > 0 ? satellitesConfig[satellitesConfig.length - 1].id + 1 : 0;
    setID(newId)
    const newSatellite = {
      id: newId,
      name: newSatelliteName,
      argumentOfPeriapsis: 0,
      trueanomly: 0,
      eccentricity: 0,
      semimajoraxis: 0,
      assendingnode: 0,
      inclination: 0,
      propagator: selectedOption,
      time: time.format(),
      preview: true,
    };
    setNewSatelliteParams(newSatellite)
    const newConfig = [...satellitesConfig, newSatellite];
    dispatch(updateSatellites(newConfig));
  };

  const handleAddSatellite = () => {
    //const newId = satellitesConfig.length > 0 ? satellitesConfig[satellitesConfig.length - 1].id + 1 : 0;
    //const newSatellite = { id: newId, name: newSatelliteName, ...newSatelliteParams, propagator: selectedOption, time: time.format() };
    //const newConfig = [...satellitesConfig, newSatellite];
    //dispatch(updateSatellites(newConfig));
    //const updatedParams = { ...newSatelliteParams, preview: false };
    //setNewSatelliteParams(updatedParams);
    const mu = 398600.4418; // Standard gravitational parameter for Earth in km^3/s^2
    const SM = newSatelliteParams.semimajoraxis

    const inclination = THREE.MathUtils.degToRad(newSatelliteParams.inclination);//Angles in Radian
    const argumentOfPeriapsis = THREE.MathUtils.degToRad(newSatelliteParams.argumentOfPeriapsis);
    const assendingnode = THREE.MathUtils.degToRad(newSatelliteParams.assendingnode);
    const trueanomly = THREE.MathUtils.degToRad(newSatelliteParams.trueanomly);

    const elements = {
      a: SM, // Semi-major axis in km
      e: newSatelliteParams.eccentricity, // Eccentricity
      M: trueanomly, // Mean anomaly in radians
      Ω: assendingnode, // Longitude of ascending node in degrees
      ω: argumentOfPeriapsis, // Argument of periapsis in degrees
      i: inclination // Inclination in degrees
      };

    const [position, velocity] = keplerianToCartesian(elements);
    let newX, newY, newZ;
    [newX, newY, newZ] = position;
    console.log(elements)
    console.log('randy')
    console.log(position)
    newX /= 3185.5;
    newY /= 3185.5;
    newZ /= 3185.5;

    dispatch(togglePreview({id: ID, preview: false}));
    dispatch(initializeParticles({ id: ID, name: newSatelliteName, tracePoints: [{ time: 0, x: newX, y: newY, z: newZ, mapX: 0, mapY: 0 }] }));
    //dispatch(updateCoordinate({ id: ID, coordinates: [] }));
    setNewSatelliteName('');
    setSelectedOption('');
    setTime(null);
    setShowNameInput(false);
    setShowParameterInput(false);
  };

  const handleParameterChange = (field, value) => {
    const updatedParams = { ...newSatelliteParams, [field]: parseFloat(value) };
    setNewSatelliteParams(updatedParams);
    dispatch(updateSatellite({id: ID, conf: newSatelliteParams}));
  };

  return (
    <div className="satellite-config" ref={satelliteConfigRef}>

      <div className="input-container">
        {showNameInput && !showParameterInput && (
          <>
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
            <div className="time-input">
              <DateTime
                value={time}
                onChange={setTime}
                inputProps={{ placeholder: 'Select Time' }}
              />
            </div>
            <button className="next-button" onClick={handleNextStep}>
              Next
            </button>
          </>
        )}
        {showParameterInput && (
          <>
            <h3>Add Initial Condition</h3>
            <div key={'semimajoraxis'} className='detail-row'>
              <label className='detail-label'>
                Semi-major Axis
              </label>
              <input 
                type='number'
                min='6400'
                max='50000'
                step='1000'
                value={newSatelliteParams['semimajoraxis']}
                onChange={(e) => handleParameterChange('semimajoraxis', e.target.value)}
                className="detail-input"
              />
            </div>
            <div key={'eccentricity'} className='detail-row'>
              <label className='detail-label'>
                Eccentricity
              </label>
              <input 
                type='number'
                min='0'
                max='1'
                step='0.05'
                value={newSatelliteParams['eccentricity']}
                onChange={(e) => handleParameterChange('eccentricity', e.target.value)}
                className="detail-input"
              />
            </div>
            <div key={'trueanomly'} className='detail-row'>
              <label className='detail-label'>
                TRUE ANOMLY
              </label>
              <input 
                type='number'
                min='0'
                max='360'
                step='1'
                value={newSatelliteParams['trueanomly']}
                onChange={(e) => handleParameterChange('trueanomly', e.target.value)}
                className="detail-input"
              />
            </div>
            <div key={'inclination'} className='detail-row'>
              <label className='detail-label'>
                Inclination
              </label>
              <input 
                type='number'
                min='0'
                max='360'
                step='1'
                value={newSatelliteParams['inclination']}
                onChange={(e) => handleParameterChange('inclination', e.target.value)}
                className="detail-input"
              />
            </div>
            <div key={'argumentOfPeriapsis'} className='detail-row'>
              <label className='detail-label'>
                Argument of Periapsis
              </label>
              <input 
                type='number'
                min='0'
                max='360'
                step='1'
                value={newSatelliteParams['argumentOfPeriapsis']}
                onChange={(e) => handleParameterChange('argumentOfPeriapsis', e.target.value)}
                className="detail-input"
              />
            </div>
            <div key={'assendingnode'} className='detail-row'>
              <label className='detail-label'>
                Assending Node
              </label>
              <input 
                type='number'
                min='0'
                max='360'
                step='1'
                value={newSatelliteParams['assendingnode']}
                onChange={(e) => handleParameterChange('assendingnode', e.target.value)}
                className="detail-input"
              />
            </div>
            <button className="add-button" onClick={handleAddSatellite}>
              Done
            </button>
          </>
        )}
        {!showNameInput && !showParameterInput && (
          <button className="add-button" onClick={handleAddSatelliteClick}>
            Add Satellite
          </button>
        )}
      </div>
    </div>
  );
};

export default AddSatellite;
