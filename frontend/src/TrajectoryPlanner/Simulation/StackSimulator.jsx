import React from 'react';
import RealSimulator from './Simulator';
import { useSelector } from 'react-redux';

const SimuStackSatellites = () => {
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);

  return (
    <>
      {satellitesConfig.map((config) => (
        <RealSimulator
          key={config.id ?? `sim-${config.name}`}
          particleId={config.id}
          propagator={config.propagator}
          burns={config.burns || []}
        />
      ))}
    </>
  );
};

export default SimuStackSatellites;
