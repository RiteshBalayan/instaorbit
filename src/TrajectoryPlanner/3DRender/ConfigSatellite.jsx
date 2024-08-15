// src/components/SatelliteConfig.js
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DateTime from 'react-datetime';
import "react-datetime/css/react-datetime.css";
import moment from 'moment';
import { updateSatellites } from '../../Store/satelliteSlice';
import { initializeParticles, resetTracePoints, deleteParticle } from '../../Store/StateTimeSeries';
import { updateCoordinate, deleteState } from '../../Store/CurrentState';
import { keplerianToCartesian } from './Functions';
import './SatelliteConfig.css';

const SatelliteConfig = () => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);
  const [newSatelliteName, setNewSatelliteName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [time, setTime] = useState(null);
  const [showParameterInput, setShowParameterInput] = useState(false);
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
    const newSatellite = {
      id: newId,
      name: newSatelliteName,
      argumentOfPeriapsis: 0,
      trueanomly: 0,
      eccentricity: 0,
      semimajoraxis: 0,
      assendingnode: 0,
      inclination: 0,
      time: time.format()
    };
    const newConfig = [...satellitesConfig, newSatellite];
    dispatch(updateSatellites(newConfig));
  };

  const handleAddSatellite = () => {
    //const newId = satellitesConfig.length > 0 ? satellitesConfig[satellitesConfig.length - 1].id + 1 : 0;
    //const newSatellite = { id: newId, name: newSatelliteName, ...newSatelliteParams, propagator: selectedOption, time: time.format() };
    //const newConfig = [...satellitesConfig, newSatellite];
    //dispatch(updateSatellites(newConfig));
    const elements = {
      a: newSatelliteParams.semimajoraxis, // Semi-major axis in km
      e: newSatelliteParams.eccentricity, // Eccentricity
      M: newSatelliteParams.meananomly, // Mean anomaly in radians
      Ω: newSatelliteParams.assendingnode, // Longitude of ascending node in degrees
      ω: newSatelliteParams.argumentOfPeriapsis, // Argument of periapsis in degrees
      i: newSatelliteParams.inclination // Inclination in degrees
      };

    const [position, velocity] = keplerianToCartesian(elements);
    let newX, newY, newZ;
    [newX, newY, newZ] = position;

    dispatch(initializeParticles({ id: newId, name: newSatelliteName, tracePoints: [{ time: 0, x: newX, y: 10, z: newZ, mapX: 0, mapY: 0 }] }));
    dispatch(updateCoordinate({ id: newId, coordinates: [] }));
    setNewSatelliteName('');
    setSelectedOption('');
    setTime(null);
    setShowNameInput(false);
    setShowParameterInput(false);
  };

  const handleParameterChange = (field, value) => {
    const updatedParams = { ...newSatelliteParams, [field]: parseFloat(value) };
    setNewSatelliteParams(updatedParams);
    dispatch(updateSatellites(
      satellitesConfig.map(satellite =>
        satellite.id === activeSatellite ? { ...satellite, ...updatedParams } : satellite
      )
    ));
  };

  {/*const handleParameterChange = (field, value) => {
    setNewSatelliteParams(prevParams => ({ ...prevParams, [field]: parseFloat(value) }));
  };*/}

  const deleteSatellite = (id) => {
    const newConfig = satellitesConfig.filter(s => s.id !== id);
    dispatch(updateSatellites(newConfig));
    dispatch(deleteParticle(id));
    dispatch(deleteState(id));
    if (activeSatellite === id) {
      setActiveSatellite(null); // Deselect the active satellite if it's deleted
    }
  };

  const handleCheckboxChange = (id) => {
    dispatch(togglePreview({ id, visibility: !satellitesConfig.find(s => s.id === id).visibility }));
  };

  const handleSatelliteClick = (id) => {
    setActiveSatellite(activeSatellite === id ? null : id);
  };

  const handleClickOutside = (event) => {
    if (satelliteConfigRef.current && !satelliteConfigRef.current.contains(event.target)) {
      setActiveSatellite(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="satellite-config" ref={satelliteConfigRef}>
      {satellitesConfig.map((satellite) => (
        <div key={satellite.id} className={`satellite-item ${activeSatellite === satellite.id ? 'active' : ''}`}>
          <h3
            onClick={() => handleSatelliteClick(satellite.id)}
            className="satellite-name"
          >
            {satellite.name}
          </h3>
          {activeSatellite === satellite.id && (
            <div className="satellite-details">
              {['trueanomly', 'argumentOfPeriapsis', 'assendingnode', 'inclination', 'semimajoraxis', 'eccentricity', 'propagator', 'time'].map((field) => (
                <div key={field} className="detail-row">
                  <label className="detail-label">
                    {field.replace(/([A-Z])/g, ' $1').toUpperCase()}:
                  </label>
                  <div className="fixed-value">{field === 'time' ? moment(satellite[field]).format('YYYY-MM-DD HH:mm:ss') : satellite[field]}</div>
                </div>
              ))}
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  checked={satellite.visibility}
                  onChange={() => handleCheckboxChange(satellite.id)}
                />
                <span>Show Preview</span>
              </div>
              <button className="delete-button" onClick={() => deleteSatellite(satellite.id)}>🗑️</button>
            </div>
          )}
        </div>
      ))}
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
            {['trueanomly', 'argumentOfPeriapsis', 'assendingnode', 'inclination', 'semimajoraxis', 'eccentricity'].map((field) => (
              <div key={field} className="detail-row">
                <label className="detail-label">
                  {field.replace(/([A-Z])/g, ' $1').toUpperCase()}:
                </label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  step={field === 'eccentricity' ? '0.01' : '1'}
                  value={newSatelliteParams[field]}
                  onChange={(e) => handleParameterChange(field, e.target.value)}
                  className="detail-input"
                />
              </div>
            ))}
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

export default SatelliteConfig;
