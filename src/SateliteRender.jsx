import React, { useEffect } from 'react';
import * as THREE from 'three';
import Satellites from './Satellites';
import { useDispatch } from 'react-redux';
import { initializeParticles } from './StateTimeSeries';


const SateliteRender = ({ elapsedTime}) => {
  const dispatch = useDispatch();

  const satellitesConfig = [
    { id: 0, radius: 2.1, theta: 0.1 },
    { id: 1, radius: 2.2, theta: 1 },
    { id: 2, radius: 2.5, theta: 0.3 },
    // Add more satellite configurations as needed
  ];

  useEffect(() => {
    if (elapsedTime === 0) {
      dispatch(initializeParticles(satellitesConfig.map(s => ({ id: s.id, tracePoints: [] }))));
    }
  }, [elapsedTime, dispatch]);




  return (
    <>
      <Satellites
        satellitesConfig={satellitesConfig}
        elapsedTime={elapsedTime}
      />
    </>
  );
};

export default SateliteRender;
