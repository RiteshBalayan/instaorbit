import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { Button, IconButton, Typography } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { updateSatellites, deleteSatellite } from '../../Store/satelliteSlice';
import { deleteParticle } from '../../Store/StateTimeSeries';
import { deleteState } from '../../Store/CurrentState';
import Timeline from '@mui/lab/Timeline';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import './SatelliteConfig.css';

const SatelliteList = () => {
  const dispatch = useDispatch();
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);
  const [activeSatellite, setActiveSatellite] = useState(null);
  const [burnInputVisible, setBurnInputVisible] = useState({});
  const [burnData, setBurnData] = useState({ x: '', y: '', z: '', time: '' });
  const satelliteConfigRef = useRef(null);

  const handleDeleteSatellite = (id) => {
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
                <Timeline
                sx={{
                  [`& .${timelineItemClasses.root}:before`]: {
                    flex: 0,
                    padding: 0,
                  },
                }}
              >

            <div className="satellite-details">
            <TimelineItem>
                <TimelineSeparator>
                  <TimelineDot />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
              <h4>Initail Elements</h4>
              {['trueanomly', 'argumentOfPeriapsis', 'assendingnode', 'inclination', 'semimajoraxis', 'eccentricity', 'propagator', 'time'].map((field) => (
                <div key={field} className="detail-row">
                  <label className="detail-label">
                    {field.replace(/([A-Z])/g, ' $1').toUpperCase()}:
                  </label>
                  <div className="fixed-value">{field === 'time' ? moment(satellite.InitialCondition[field]).format('YYYY-MM-DD HH:mm:ss') : satellite.InitialCondition[field]}</div>
                </div>
              ))}
              </TimelineContent>
              </TimelineItem>

              {satellite.burns && satellite.burns.length > 0 && (
                <div className="burns-section">
                  {/*<h4>Burn Data</h4>*/}
                  {satellite.burns.map((burn, index) => (
                                <TimelineItem>
                                <TimelineSeparator>
                                  <TimelineDot />
                                  <TimelineConnector />
                                </TimelineSeparator>
                                <TimelineContent>
                    <div key={index} className="burn-item">
                      <h4>Burn {index + 1}</h4>
                      <div className="burn-details">
                        <div className="detail-row">
                          <label className="detail-label"><span style={{ fontStyle: 'italic' }}>v</span><sub>x</sub></label>
                          <div className="fixed-value">{burn.x}</div>
                        </div>
                        <div className="detail-row">
                        <label className="detail-label"><span style={{ fontStyle: 'italic' }}>v</span><sub>y</sub></label>
                          <div className="fixed-value">{burn.y}</div>
                        </div>
                        <div className="detail-row">
                        <label className="detail-label"><span style={{ fontStyle: 'italic' }}>v</span><sub>z</sub></label>
                          <div className="fixed-value">{burn.z}</div>
                        </div>
                        <div className="detail-row">
                          <label className="detail-label">Time:</label>
                          <div className="fixed-value">{burn.time}</div>
                        </div>
                      </div>
                    </div>
                    </TimelineContent>
                    </TimelineItem>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                <IconButton 
                  color="primary" 
                  onClick={() => handleAddBurnClick(satellite.id)} 
                >
                  <LocalFireDepartmentIcon /> 
                </IconButton>
                <Typography variant="body2">add burn</Typography>
              </div>

              {burnInputVisible[satellite.id] && (
                <div className="burn-inputs">
                  <div className='detail-row'> 
                    <label className='detail-label'>
                      Vx
                    </label>
                    <input
                      type="number"
                      placeholder="Vx"
                      value={burnData.x}
                      onChange={(e) => handleBurnDataChange('x', e.target.value)}
                      className="detail-input"
                    />
                  </div>
                  <div className='detail-row'> 
                    <label className='detail-label'>
                      Vy
                    </label>
                    <input
                      type="number"
                      placeholder="Vy"
                      value={burnData.y}
                      onChange={(e) => handleBurnDataChange('y', e.target.value)}
                      className="detail-input"
                    />
                  </div>
                  <div className='detail-row'> 
                    <label className='detail-label'>
                      Vz
                    </label>
                    <input
                      type="number"
                      placeholder="Vz"
                      value={burnData.z}
                      onChange={(e) => handleBurnDataChange('z', e.target.value)}
                      className="detail-input"
                    />
                  </div>
                  <div className='detail-row'> 
                    <label className='detail-label'>
                      Burn Time
                    </label>
                    <input
                      type="number"
                      placeholder="time"
                      value={burnData.time}
                      onChange={(e) => handleBurnDataChange('time', e.target.value)}
                      className="detail-input"
                    />
                  </div>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleDoneClick(satellite.id)}
                    style={{ marginTop: '10px' }}
                  >
                    Done
                  </Button>
                </div>
              )}
                <IconButton
                  color="secondary"
                  onClick={() => handleDeleteSatellite(satellite.id)}
                  style={{ marginTop: '10px' }}
                >
                  <DeleteIcon />
                </IconButton>
            </div>
            </Timeline>
          )}
        </div>
      ))}
    </div>
  );
};

export default SatelliteList;