import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSatellites } from '../Store/satelliteSlice';
import { initializeParticles, resetTracePoints, deleteParticle } from '../Store/StateTimeSeries';
import { updateCoordinate, deleteState, togglePreview } from '../Store/CurrentState';

const SatelliteConfig = () => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);

  const addSatellite = () => {
    const newId = satellitesConfig.length > 0 ? satellitesConfig[satellitesConfig.length - 1].id + 1 : 0;
    const newSatellite = { id: newId, argumentOfPeriapsis: 0, theta: 0,  eccentricity: 0, closestapproch:0, nodalrotation:0, trueanomly:0};
    const newConfig = [...satellitesConfig, newSatellite];
    dispatch(updateSatellites(newConfig));
    dispatch(initializeParticles({ id: newId, tracePoints: [{time: 0, x: 0, y: 0, z: 0, mapX: 0, mapY: 0}]}))
    dispatch(updateCoordinate({id: newId, coordinates: [] }))
  };

  const updateSatellite = (id, field, value) => {
    const newConfig = satellitesConfig.map(s => s.id === id ? { ...s, [field]: parseFloat(value) } : s);
    dispatch(updateSatellites(newConfig));
    dispatch(resetTracePoints(id));
    dispatch(updateCoordinate({id: id, coordinates: []}))

    // Set timeout to reset visibility to false after 3 seconds
    dispatch(togglePreview({id: id, visibility: true}))
    
    setTimeout(() => {
    dispatch(togglePreview({ id: id, visibility: false }));
    }, 5000);
    };

  const deleteSatellite = (id) => {
    const newConfig = satellitesConfig.filter(s => s.id !== id);
    dispatch(updateSatellites(newConfig));
    dispatch(deleteParticle(id));
    dispatch(deleteSatellite(id));
  };

  const handleCheckboxChange = () => {
    togglePreview(!visibility);  // Toggle visibility state
  };

  return (
    <div>
      {satellitesConfig.map((satellite) => (
        <div key={satellite.id} style={{ marginBottom: '10px' }}>
            <label>
            True Anomoly:
            <input
              type="range"
              min="0"
              max="360"
              value={satellite.trueanomly}
              onChange={(e) => updateSatellite(satellite.id, 'trueanomly', e.target.value)}
            />
            {satellite.trueanomly}
          </label>
          <label>
            Argument Of Periapsis:
            <input
              type="range"
              min="0"
              max="360"
              value={satellite.argumentOfPeriapsis}
              onChange={(e) => updateSatellite(satellite.id, 'argumentOfPeriapsis', e.target.value)}
            />
            {satellite.argumentOfPeriapsis}
          </label>
          <label>
            Nodal Rotation:
            <input
              type="range"
              min="0"
              max="360"
              value={satellite.nodalrotation}
              onChange={(e) => updateSatellite(satellite.id, 'nodalrotation', e.target.value)}
            />
            {satellite.nodalrotation}
          </label>
          <label>
            Theta:
            <input
              type="range"
              min="0"
              max="360"
              value={satellite.theta}
              onChange={(e) => updateSatellite(satellite.id, 'theta', e.target.value)}
            />
            {satellite.theta}
          </label>
          <label>
            Closest Approach:
            <input
              type="range"
              min="0"
              max="50"
              step="0.01"
              value={satellite.closestapproch}
              onChange={(e) => updateSatellite(satellite.id, 'closestapproch', e.target.value)}
            />
            {satellite.closestapproch}
          </label>
          <label>
            Eccentricity:
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={satellite.eccentricity}
              onChange={(e) => updateSatellite(satellite.id, 'eccentricity', e.target.value)}
            />
            {satellite.eccentricity}
          </label>
          <label>
                <input
                    type="checkbox"
                    
                    onChange={handleCheckboxChange}
                />
                Show Preview
            </label>
          <button onClick={() => deleteSatellite(satellite.id)}>Delete</button>
        </div>
      ))}
      <button onClick={addSatellite}>Add Satellite</button>
    </div>
  );
};

export default SatelliteConfig;
