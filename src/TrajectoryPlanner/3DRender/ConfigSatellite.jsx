// src/components/SatelliteConfig.js
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSatellites } from '../../Store/satelliteSlice';
import { initializeParticles, resetTracePoints, deleteParticle } from '../../Store/StateTimeSeries';
import { updateCoordinate, deleteState, togglePreview } from '../../Store/CurrentState';
import './SatelliteConfig.css'; // Importing CSS file

const SatelliteConfig = () => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);
  const [newSatelliteName, setNewSatelliteName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [activeSatellite, setActiveSatellite] = useState(null);

  const handleAddSatelliteClick = () => {
    setShowNameInput(true);
  };

  const handleAddSatellite = () => {
    if (newSatelliteName.trim() === '') {
      alert('Satellite name cannot be empty');
      return;
    }
    const newId = satellitesConfig.length > 0 ? satellitesConfig[satellitesConfig.length - 1].id + 1 : 0;
    const newSatellite = { id: newId, name: newSatelliteName, argumentOfPeriapsis: 0, theta: 0, eccentricity: 0, closestapproch: 0, nodalrotation: 0, trueanomly: 0 };
    const newConfig = [...satellitesConfig, newSatellite];
    dispatch(updateSatellites(newConfig));
    dispatch(initializeParticles({ id: newId, name: newSatelliteName, tracePoints: [{ time: 0, x: 0, y: 0, z: 0, mapX: 0, mapY: 0 }] }));
    dispatch(updateCoordinate({ id: newId, coordinates: [] }));
    setNewSatelliteName('');
    setShowNameInput(false);
  };

  const updateSatellite = (id, field, value) => {
    const newConfig = satellitesConfig.map(s => s.id === id ? { ...s, [field]: parseFloat(value) } : s);
    dispatch(updateSatellites(newConfig));
    dispatch(resetTracePoints(id));
    dispatch(updateCoordinate({ id: id, coordinates: [] }));
    dispatch(togglePreview({ id: id, visibility: true }));

    setTimeout(() => {
      dispatch(togglePreview({ id: id, visibility: false }));
    }, 5000);
  };

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

  return (
    <div className="satellite-config">
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
              {['trueanomly', 'argumentOfPeriapsis', 'nodalrotation', 'theta', 'closestapproch', 'eccentricity'].map((field) => (
                <div key={field} className="detail-row">
                  <label className="detail-label">
                    {field.replace(/([A-Z])/g, ' $1').toUpperCase()}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    step={field === 'eccentricity' ? '0.01' : '1'}
                    value={satellite[field]}
                    onChange={(e) => updateSatellite(satellite.id, field, e.target.value)}
                    className="detail-input"
                  />
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
      {showNameInput ? (
        <div className="input-container">
          <input
            type="text"
            placeholder="Enter satellite name"
            value={newSatelliteName}
            onChange={(e) => setNewSatelliteName(e.target.value)}
            className="name-input"
          />
          <button className="add-button" onClick={handleAddSatellite}>✔️</button>
        </div>
      ) : (
        <button className="add-button" onClick={handleAddSatelliteClick}>➕</button>
      )}
    </div>
  );
};

export default SatelliteConfig;
