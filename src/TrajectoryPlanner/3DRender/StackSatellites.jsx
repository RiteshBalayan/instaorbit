import React from 'react';
import Satellite from './SimulateSatellite';
import { useSelector } from 'react-redux';

const StackSatellites = () => {
  const satellitesConfig = useSelector(state => state.satellites.satellitesConfig);

  return (
    <>
      {satellitesConfig.map((config, index) => (
        <Satellite
          key={index}
          particleId={config.id}
          argumentOfPeriapsis={config.argumentOfPeriapsis}
          theta={config.theta}
          eccentricity={config.eccentricity}
          closestapproch={config.closestapproch}
          nodalrotation={config.nodalrotation}
          trueanomly={config.trueanomly}
        />
      ))}
    </>
  );
};

export default StackSatellites;
