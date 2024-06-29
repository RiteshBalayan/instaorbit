import React from 'react';
import Satellite from './Satellite';

const Satellites = ({ satellitesConfig, elapsedTime }) => {
  return (
    <>
      {satellitesConfig.map((config, index) => (
        <Satellite
          key={index}
          elapsedTime={elapsedTime}
          radius={config.radius}
          theta={config.theta}
        />
      ))}
    </>
  );
};

export default Satellites;
