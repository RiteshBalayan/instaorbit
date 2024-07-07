import React from 'react';
import Satellite from './Satellite';

const Satellites = ({ satellitesConfig, elapsedTime }) => {
  return (
    <>
      {satellitesConfig.map((config, index) => (
        <Satellite
          key={index}
          particleId={config.id}
          elapsedTime={elapsedTime}
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

export default Satellites;
