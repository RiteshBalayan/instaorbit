import React from 'react';
import { Canvas } from 'react-three-fiber';
import { useSelector } from 'react-redux';
import SatelliteConfig from './SatelliteConfig';
import Satellites from './Satellites';

const SatelliteRender = ({ elapsedTime }) => {
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);

  
  return (
    
      <Satellites satellitesConfig={satellitesConfig} elapsedTime={elapsedTime} />

  );
};

export default SatelliteRender;
