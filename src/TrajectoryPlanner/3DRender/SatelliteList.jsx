import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { updateSatellites, deleteSatellite } from '../../Store/satelliteSlice';
import { deleteParticle } from '../../Store/StateTimeSeries';
import { deleteState } from '../../Store/CurrentState';
import './SatelliteConfig.css';

const SatelliteList = () => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);
  const [activeSatellite, setActiveSatellite] = useState(null);
  const [burnInputVisible, setBurnInputVisible] = useState({});
  const [burnData, setBurnData] = useState({ x: '', y: '', z: '', time: '' });
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

  const handleSatelliteClick = (id) => {
    setActiveSatellite(activeSatellite === id ? null : id);
  };

  const handleClickOutside = (event) => {
    if (satelliteConfigRef.current && !satelliteConfigRef.current.contains(event.target)) {
      setActiveSatellite(null);
    }
  };

  const handleAddBurnClick = (id) => {
    setBurnInputVisible(prevState => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  const handleBurnDataChange = (field, value) => {
    setBurnData(prevState => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleDoneClick = (id) => {
    const newBurn = {
      x: parseFloat(burnData.x),
      y: parseFloat(burnData.y),
      z: parseFloat(burnData.z),
      time: parseFloat(burnData.time),
    };

    const newConfig = satellitesConfig.map(satellite => {
      if (satellite.id === id) {
        return {
          ...satellite,
          burns: [...(satellite.burns || []), newBurn],
        };
      }
      return satellite;
    });

    dispatch(updateSatellites(newConfig));
    setBurnInputVisible(prevState => ({
      ...prevState,
      [id]: false,
    }));
    setBurnData({ x: '', y: '', z: '', time: '' });
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
                  <div className="fixed-value">{field === 'time' ? moment(satellite.InitialCondition[field]).format('YYYY-MM-DD HH:mm:ss') : satellite.InitialCondition[field]}</div>
                </div>
              ))}

              {satellite.burns && satellite.burns.length > 0 && (
                <div className="burns-section">
                  <h4>Burn Data</h4>
                  {satellite.burns.map((burn, index) => (
                    <div key={index} className="burn-item">
                      <h5>Burn {index + 1}</h5>
                      <div className="burn-details">
                        <div>X: {burn.x}</div>
                        <div>Y: {burn.y}</div>
                        <div>Z: {burn.z}</div>
                        <div>Time: {burn.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="delete-button" onClick={() => deleteSatellite(satellite.id)}>🗑️</button>
              <button className="add-burn-button" onClick={() => handleAddBurnClick(satellite.id)}>Add Burn</button>
              {burnInputVisible[satellite.id] && (
                <div className="burn-inputs">
                  <input
                    type="number"
                    placeholder="x"
                    value={burnData.x}
                    onChange={(e) => handleBurnDataChange('x', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="y"
                    value={burnData.y}
                    onChange={(e) => handleBurnDataChange('y', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="z"
                    value={burnData.z}
                    onChange={(e) => handleBurnDataChange('z', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="time"
                    value={burnData.time}
                    onChange={(e) => handleBurnDataChange('time', e.target.value)}
                  />
                  <button className="done-button" onClick={() => handleDoneClick(satellite.id)}>Done</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SatelliteList;
