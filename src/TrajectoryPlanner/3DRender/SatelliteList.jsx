// src/components/SatelliteConfig.js
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { updateSatellites } from '../../Store/satelliteSlice';
import { deleteParticle } from '../../Store/StateTimeSeries';
import { deleteState } from '../../Store/CurrentState';
import './SatelliteConfig.css';

const SatelliteList = () => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);
  const [activeSatellite, setActiveSatellite] = useState(null);
  const satelliteConfigRef = useRef(null);

  const deleteSatellite = (id) => {
    const newConfig = satellitesConfig.filter(s => s.id !== id);
    dispatch(updateSatellites(newConfig));
    dispatch(deleteParticle(id));
    dispatch(deleteState(id));
    if (activeSatellite === id) {
      setActiveSatellite(null); // Deselect the active satellite if it's deleted
    }
  };

  {/*const handleCheckboxChange = (id) => {
    dispatch(togglePreview({ id, visibility: !satellitesConfig.find(s => s.id === id).visibility }));
  };*/}

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
              {/*<div className="checkbox-container">
                <input
                  type="checkbox"
                  checked={satellite.visibility}
                  onChange={() => handleCheckboxChange(satellite.id)}
                />
                <span>Show Preview</span>
              </div>*/}
              <button className="delete-button" onClick={() => deleteSatellite(satellite.id)}>🗑️</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SatelliteList;
