import React from 'react';
import RealSimulator from './RealSimulator';
import { useSelector } from 'react-redux';

const SimuStackSatellites = () => {
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);

  return (
    <>
      {satellitesConfig.map((config, index) => (
        <RealSimulator
          key={index}
          particleId={config.id}
          propagator={config.propagator}
          burn={config.burns}
        />
      ))}
    </>
  );
};

export default SimuStackSatellites;
