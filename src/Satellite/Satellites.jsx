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
          radius={config.radius}
          theta={config.theta}
          eccentricity={config.eccentricity}
          closestapproch={config.closestapproch}
        />
      ))}
    </>
  );
};

export default Satellites;
