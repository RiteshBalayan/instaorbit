import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSatellites } from '../Store/satelliteSlice';
import { initializeParticles } from '../Store/StateTimeSeries'

const SatelliteConfig = () => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);

  const addSatellite = () => {
    const newId = satellitesConfig.length > 0 ? satellitesConfig[satellitesConfig.length - 1].id + 1 : 0;
    const newSatellite = { id: newId, radius: 0, theta: 0,  eccentricity: 0, closestapproch:0};
    const newConfig = [...satellitesConfig, newSatellite];
    dispatch(updateSatellites(newConfig));
    dispatch(initializeParticles({ id: newId, tracePoints: [{time: 0, x: 0, y: 0, z: 0, mapX: 0, mapY: 0}]}))
  };

  const updateSatellite = (id, field, value) => {
    const newConfig = satellitesConfig.map(s => s.id === id ? { ...s, [field]: parseFloat(value) } : s);
    dispatch(updateSatellites(newConfig));
  };

  const deleteSatellite = (id) => {
    const newConfig = satellitesConfig.filter(s => s.id !== id);
    dispatch(updateSatellites(newConfig));
  };

  return (
    <div>
      {satellitesConfig.map((satellite) => (
        <div key={satellite.id} style={{ marginBottom: '10px' }}>
          <label>
            Radius:
            <input
              type="number"
              value={satellite.radius}
              onChange={(e) => updateSatellite(satellite.id, 'radius', e.target.value)}
            />
          </label>
          <label>
            Theta:
            <input
              type="number"
              value={satellite.theta}
              onChange={(e) => updateSatellite(satellite.id, 'theta', e.target.value)}
            />
          </label>
          <label>
          Closestapproch:
            <input
              type="number"
              value={satellite.closestapproch}
              onChange={(e) => updateSatellite(satellite.id, 'closestapproch', e.target.value)}
            />
          </label>
          <label>
          Eccentricity:
            <input
              type="number"
              value={satellite.eccentricity}
              onChange={(e) => updateSatellite(satellite.id, 'eccentricity', e.target.value)}
            />
          </label>
          <button onClick={() => deleteSatellite(satellite.id)}>Delete</button>
        </div>
      ))}
      <button onClick={addSatellite}>Add Satellite</button>
    </div>
  );
};

export default SatelliteConfig;
