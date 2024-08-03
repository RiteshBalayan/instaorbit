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
          inclination={config.inclination}
          eccentricity={config.eccentricity}
          semimajoraxis={config.semimajoraxis}
          assendingnode={config.assendingnode}
          trueanomly={config.trueanomly}
          propagator={config.propagator}
          time={config.time}
        />
      ))}
    </>
  );
};

export default StackSatellites;
